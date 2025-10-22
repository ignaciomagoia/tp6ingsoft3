package main

import (
	"context"

	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type User struct {
	Email    string `json:"email" bson:"email"`
	Password string `json:"password" bson:"password"`
}

var userCollection *mongo.Collection
var todoCollection *mongo.Collection

type Todo struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Email     string             `json:"email" bson:"email"`
	Title     string             `json:"title" bson:"title"`
	Completed bool               `json:"completed" bson:"completed"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
}

type TodoResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Title     string    `json:"title"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"createdAt"`
}

func toTodoResponse(todo Todo) TodoResponse {
	return TodoResponse{
		ID:        todo.ID.Hex(),
		Email:     todo.Email,
		Title:     todo.Title,
		Completed: todo.Completed,
		CreatedAt: todo.CreatedAt,
	}
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeText(s string) string {
	return strings.TrimSpace(s)
}

func main() {
	// Leer variable de entorno
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	// Conexión a MongoDB
	client, err := mongo.NewClient(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.Connect(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// Usar base de datos y colección
	db := client.Database("hotelapp")
	userCollection = db.Collection("users")
	todoCollection = db.Collection("todos")

	// Iniciar Gin
	r := gin.Default()

	// Configurar CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "http://localhost:3001"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	config.AllowOriginFunc = func(origin string) bool {
		// Permitimos también el origen de Nginx de QA y PROD
		return origin == "http://localhost:3000" || origin == "http://localhost:3001"
	}

	r.Use(cors.New(config))

	// Registro de usuario
	r.POST("/register", registerUser)

	// Login de usuario
	r.POST("/login", loginUser)

	// Health Check
	r.GET("/healthz", healthHandler)

	// Endpoints de testing
	r.GET("/users", listUsers)
	r.DELETE("/users", clearUsers)

	// To-Do CRUD
	r.GET("/todos", listTodos)
	r.POST("/todos", createTodo)
	r.PUT("/todos/:id", updateTodo)
	r.DELETE("/todos/:id", deleteTodo)
	r.DELETE("/todos", clearTodos)

	// Iniciar servidor
	r.Run(":8080")
}

func registerUser(c *gin.Context) {
	var user User
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	// Validar campos requeridos
	user.Email = normalizeEmail(user.Email)
	user.Password = normalizeText(user.Password)
	if user.Email == "" || user.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email y contraseña son requeridos"})
		return
	}

	// Verificar si ya existe el usuario
	var existing User
	err := userCollection.FindOne(context.TODO(), bson.M{"email": user.Email}).Decode(&existing)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Usuario ya existe"})
		return
	}

	_, err = userCollection.InsertOne(context.TODO(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Usuario registrado con éxito"})
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC(),
	})
}

func loginUser(c *gin.Context) {
	var user User
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	// Validar campos requeridos
	user.Email = normalizeEmail(user.Email)
	user.Password = normalizeText(user.Password)
	if user.Email == "" || user.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email y contraseña son requeridos"})
		return
	}

	var found User
	err := userCollection.FindOne(context.TODO(), bson.M{"email": user.Email}).Decode(&found)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	// Verificar password
	if found.Password != user.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password incorrecto"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login exitoso"})
}

func listUsers(c *gin.Context) {
	cursor, err := userCollection.Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener usuarios"})
		return
	}
	defer cursor.Close(context.TODO())

	var users []User
	if err = cursor.All(context.TODO(), &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al procesar usuarios"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

func clearUsers(c *gin.Context) {
	_, err := userCollection.DeleteMany(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al limpiar usuarios"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todos los usuarios han sido eliminados"})
}

// ----- To-Do Handlers -----

func listTodos(c *gin.Context) {
	email := c.Query("email")
	filter := bson.M{}
	if email != "" {
		filter["email"] = normalizeEmail(email)
	}
	cursor, err := todoCollection.Find(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener tareas"})
		return
	}
	defer cursor.Close(context.TODO())

	var todos []Todo
	if err := cursor.All(context.TODO(), &todos); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al procesar tareas"})
		return
	}

	todoResponses := make([]TodoResponse, 0, len(todos))
	for _, todo := range todos {
		todoResponses = append(todoResponses, toTodoResponse(todo))
	}

	c.JSON(http.StatusOK, gin.H{"todos": todoResponses})
}

func createTodo(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
		Title string `json:"title"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	input.Email = normalizeEmail(input.Email)
	input.Title = normalizeText(input.Title)
	if input.Email == "" || input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email y título son requeridos"})
		return
	}

	todo := Todo{
		Email:     input.Email,
		Title:     input.Title,
		Completed: false,
		CreatedAt: time.Now().UTC(),
	}
	res, err := todoCollection.InsertOne(context.TODO(), todo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear tarea"})
		return
	}

	insertedID, _ := res.InsertedID.(primitive.ObjectID)
	todo.ID = insertedID
	c.JSON(http.StatusCreated, gin.H{"todo": toTodoResponse(todo)})
}

func updateTodo(c *gin.Context) {
	idHex := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var input struct {
		Title     *string `json:"title"`
		Completed *bool   `json:"completed"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	update := bson.M{}
	if input.Title != nil {
		title := normalizeText(*input.Title)
		if title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "El título no puede estar vacío"})
			return
		}
		update["title"] = title
	}
	if input.Completed != nil {
		update["completed"] = *input.Completed
	}
	if len(update) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada para actualizar"})
		return
	}

	_, err = todoCollection.UpdateByID(context.TODO(), objID, bson.M{"$set": update})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar tarea"})
		return
	}

	var updated Todo
	if err := todoCollection.FindOne(context.TODO(), bson.M{"_id": objID}).Decode(&updated); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al leer tarea actualizada"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"todo": toTodoResponse(updated)})
}

func deleteTodo(c *gin.Context) {
	idHex := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	_, err = todoCollection.DeleteOne(context.TODO(), bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar tarea"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tarea eliminada"})
}

func clearTodos(c *gin.Context) {
	email := c.Query("email")
	filter := bson.M{}
	if email != "" {
		filter["email"] = email
	}
	_, err := todoCollection.DeleteMany(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al limpiar tareas"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tareas eliminadas"})
}
