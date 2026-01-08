<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Transcribir - Video Transcriber Pro

Esta aplicación permite transcribir videos utilizando la API de Gemini de Google.

View your app in AI Studio: https://ai.studio/apps/drive/1HMsBGc-pyPFwt6n7_hNyfood1DdwHIwb

## 🚀 Despliegue en Easy Panel

Easy Panel es una plataforma de hosting que facilita el despliegue de aplicaciones con Docker.

### Requisitos previos

1. Una cuenta en [Easy Panel](https://easypanel.io/)
2. Una API Key de Gemini (obtenerla en [Google AI Studio](https://aistudio.google.com/app/apikey))
3. Acceso al repositorio de GitHub

### Pasos para desplegar

1. **Conecta tu repositorio a Easy Panel:**
   - En el panel de Easy Panel, crea un nuevo proyecto
   - Selecciona "From GitHub Repository"
   - Conecta este repositorio: `elian-pro/Transcribir`
   - Selecciona la rama que deseas desplegar

2. **Configuración del proyecto:**
   - **Build Method:** Docker
   - **Dockerfile Path:** `./Dockerfile`
   - **Port:** `80`

3. **Variables de entorno:**
   En la sección de **Environment** de Easy Panel, agrega:
   ```
   GEMINI_API_KEY=tu_api_key_aqui
   ```

   ✅ Simplemente agrega la variable en "Environment Variables" - ¡Así de fácil!

4. **Construir y desplegar:**
   - Haz clic en "Deploy"
   - Easy Panel construirá la imagen Docker automáticamente
   - Una vez completado, tu aplicación estará disponible en la URL proporcionada

### Configuración avanzada en Easy Panel

- **Health Check:** La aplicación incluye un endpoint `/health` para monitoreo
- **Auto Deploy:** Configura el webhook de GitHub para despliegues automáticos
- **Dominios personalizados:** Puedes agregar tu propio dominio en la configuración de Easy Panel

## 🐳 Desarrollo local con Docker

### Usando Docker Compose

```bash
# 1. Clona el repositorio
git clone https://github.com/elian-pro/Transcribir.git
cd Transcribir

# 2. Crea un archivo .env con tu API key
echo "GEMINI_API_KEY=tu_api_key_aqui" > .env

# 3. Construye y ejecuta con Docker Compose
docker-compose up --build

# La aplicación estará disponible en http://localhost
```

### Usando Docker directamente

```bash
# Construir la imagen
docker build -t transcribir .

# Ejecutar el contenedor con tu API key
docker run -p 80:80 -e GEMINI_API_KEY=tu_api_key_aqui transcribir

# La aplicación estará disponible en http://localhost
```

## 💻 Desarrollo local sin Docker

**Prerequisites:** Node.js 20+

1. Clona el repositorio:
   ```bash
   git clone https://github.com/elian-pro/Transcribir.git
   cd Transcribir
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env.local` con tu API key:
   ```bash
   cp .env.example .env.local
   # Edita .env.local y agrega tu GEMINI_API_KEY
   ```

4. Ejecuta la aplicación en modo desarrollo:
   ```bash
   npm run dev
   ```

5. Abre tu navegador en `http://localhost:3000`

## 📦 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la build de producción

## 🔑 Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la key y agrégala a tu archivo `.env.local` o como variable de entorno en Easy Panel

## 📝 Notas importantes

- La API key de Gemini se incluye en el build del frontend, por lo que es visible en el código del cliente
- Para aplicaciones en producción, considera implementar un backend que maneje las llamadas a la API de forma segura
- Easy Panel maneja automáticamente las certificaciones SSL/TLS para tu dominio

## 🛠️ Stack tecnológico

- **React 19** - Framework de UI
- **Vite** - Build tool y dev server
- **TypeScript** - Lenguaje de programación
- **Gemini API** - Transcripción de videos con IA
- **Nginx** - Servidor web (en producción)
- **Docker** - Containerización
