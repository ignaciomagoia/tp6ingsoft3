1. Objetivo del proyecto

El objetivo fue construir una aplicación compuesta por backend en Go, base de datos en MongoDB y frontend en React, todo orquestado con Docker Compose para gestionar entornos de QA y PROD.

2. Arquitectura de la solución

Se diseñaron 6 contenedores en total, organizados de la siguiente forma:

Entorno QA

mongo_db_qa → contenedor de MongoDB

go_api_qa → contenedor con la API en Go

frontend_qa → contenedor con la app React

Entorno PROD

mongo_db_prod → contenedor de MongoDB

go_api_prod → contenedor con la API en Go

frontend_prod → contenedor con la app React

Cada entorno cuenta con su propia base de datos, API y frontend independientes, lo que permite realizar pruebas sin afectar producción.

3. Backend (API en Go)

Se utilizó Go con el framework Gin para construir la API.

La API se conecta a MongoDB usando la variable de entorno MONGO_URI.

Se implementaron endpoints de registro y login de usuarios.

Se manejan errores como 409 Conflict en caso de que el usuario ya exista.

La API se expone en dos puertos distintos según el entorno:

QA: 8081

PROD: 8082

4. Base de datos (MongoDB)

Se usó la imagen oficial de MongoDB.

Cada entorno tiene un contenedor separado de Mongo con su volumen persistente:

mongo_data_qa

mongo_data_prod

Los puertos de Mongo también se separaron:

QA: 27018

PROD: 27019

5. Frontend (React)

Se creó un Dockerfile multi-stage:

Etapa 1: build de React con Node.js.

Etapa 2: servir la aplicación con Nginx.

El frontend se expone en:

QA: 3000

PROD: 3001

El frontend se conecta a la API correspondiente en cada entorno (8081 para QA y 8082 para PROD).

6. Orquestación con Docker Compose

Se definió un único docker-compose.yml con los dos entornos (QA y PROD).

Cada servicio tiene su contenedor, puerto y volumen asignados.

Se utilizó la instrucción depends_on para asegurar que el frontend no arranque antes que la API, y que la API espere a la base de datos.