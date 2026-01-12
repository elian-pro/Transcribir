# Video Transcriber Pro

Esta herramienta permite extraer el audio de archivos MP4 y generar transcripciones automáticas utilizando la API de Gemini.

## Despliegue en EasyPanel

1. Crea un nuevo proyecto en tu EasyPanel.
2. Selecciona **Git Repository** y pega la URL de tu repositorio de GitHub.
3. En la sección de **Environment Variables** (Variables de Entorno), añade:
   - `API_KEY`: Tu clave de Google AI Studio (si prefieres no usar la entrada manual en la UI).
4. EasyPanel detectará el `Dockerfile` y desplegará la aplicación automáticamente.

## Desarrollo Local

```bash
npm install
npm run dev
```

Recuerda configurar tu `API_KEY` en un archivo `.env` o como variable de entorno si deseas que se inyecte automáticamente al compilar.

## Apéndice: Contenido del Dockerfile

A continuación se muestra el contenido del archivo `Dockerfile` utilizado para el despliegue automático, para fines de cotejo:

```dockerfile
# Etapa 1: Construcción
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG API_KEY
ENV API_KEY=$API_KEY
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```