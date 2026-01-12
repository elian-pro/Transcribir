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
# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiar archivos estáticos compilados
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
