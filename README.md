# tp6ingsoft3

Aplicación full stack para el TP6 de Ingeniería de Software: backend en Go (Gin) con MongoDB y frontend en React.

## Requisitos

- Go 1.23+
- Node.js 20/22 + npm
- MongoDB 6+

## Ejecución local

```bash
# Backend
MONGO_URI="mongodb://localhost:27017" go run main.go

# Frontend
cd frontend
npm install
npm start
```

## Scripts útiles

- `npm run build`: genera el build de producción del frontend.
- `go test ./...`: ejecuta los tests del backend (una vez que se agreguen).

## CI/CD

El pipeline definido en `.github/workflows/azure-cicd-pipeline.yml`:

1. Compila y testea el backend en Go.
2. Construye el frontend de React.
3. Empaqueta binario + build del frontend.
4. Despliega automáticamente a Azure Web App QA.
5. Permite desplegar manualmente a Producción (con _publish profiles_ y `MONGO_URI` configurados en Azure).
