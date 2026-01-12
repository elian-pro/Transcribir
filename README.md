
# Video Transcriber Pro

Esta herramienta permite extraer el audio de archivos MP4 y generar transcripciones automáticas utilizando la API de Gemini.

## Despliegue en EasyPanel

1. Crea un nuevo proyecto en tu EasyPanel.
2. Selecciona **Git Repository** y pega la URL de tu repositorio de GitHub.
3. En la sección de **Environment Variables** (Variables de Entorno), añade:
   - `API_KEY`: Tu clave de Google AI Studio.
4. EasyPanel detectará el `Dockerfile` y desplegará la aplicación automáticamente.

## Desarrollo Local

```bash
npm install
npm run dev
```

Recuerda configurar tu `API_KEY` en un archivo `.env` o como variable de entorno.
