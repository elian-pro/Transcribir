# 🚀 Guía de Despliegue en Easy Panel

Esta guía detalla paso a paso cómo desplegar la aplicación Transcribir en Easy Panel.

## 📋 Pre-requisitos

Antes de comenzar, asegúrate de tener:

1. ✅ Una cuenta en [Easy Panel](https://easypanel.io/)
2. ✅ Tu repositorio en GitHub (ya lo tienes: `elian-pro/Transcribir`)
3. ✅ Una API Key de Gemini ([obtenerla aquí](https://aistudio.google.com/app/apikey))
4. ✅ Acceso a tu servidor donde está instalado Easy Panel

## 🎯 Pasos para Desplegar

### 1. Acceder a Easy Panel

1. Ingresa a tu instalación de Easy Panel
2. Ve a la sección de "Projects"
3. Haz clic en "Create Project"

### 2. Configurar el Proyecto

#### Configuración General

- **Project Name:** `transcribir` (o el nombre que prefieras)
- **Description:** `Aplicación de transcripción de videos con IA`

#### Configuración del Servicio

1. Dentro del proyecto, crea un nuevo servicio
2. Selecciona **"App"** como tipo de servicio
3. Elige **"GitHub"** como fuente

#### Conectar con GitHub

1. Autoriza a Easy Panel para acceder a tu GitHub
2. Selecciona el repositorio: `elian-pro/Transcribir`
3. Selecciona la rama: `main` (o `claude/git-easy-panel-setup-fuHia` para testing)

### 3. Configuración de Build

Configura los siguientes valores:

```yaml
Build Type: Dockerfile
Dockerfile Path: ./Dockerfile
Build Context: .
```

### 4. Configuración de Red y Puertos

```yaml
Container Port: 80
Expose Port: Sí
Domain: (Easy Panel te asignará uno automáticamente)
```

Si quieres usar un dominio personalizado:
1. Ve a la sección de "Domains"
2. Agrega tu dominio
3. Configura los DNS según las instrucciones de Easy Panel

### 5. Variables de Entorno

En Easy Panel, busca la sección de **Environment** o **Environment Variables** y agrega:

```
GEMINI_API_KEY=tu_api_key_aqui
```

✅ **Es así de simple!** Solo agrega la variable de entorno normal.

**Cómo obtener la API Key:**
1. Ve a https://aistudio.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Cópiala y agrégala como **Environment Variable** en Easy Panel

**Cómo funciona:**
La aplicación carga la API key en tiempo de ejecución (runtime), por lo que solo necesitas agregarla como una variable de entorno normal. El contenedor Docker la inyectará automáticamente cuando inicie.

### 6. Recursos (Opcional)

Configura los recursos según tus necesidades:

```yaml
Memory: 512 MB (mínimo recomendado)
CPU: 0.5 cores (mínimo recomendado)
```

Para mayor tráfico, considera:
```yaml
Memory: 1 GB
CPU: 1 core
```

### 7. Health Check

Easy Panel detectará automáticamente el health check en `/health`

Si necesitas configurarlo manualmente:
```yaml
Health Check Path: /health
Health Check Interval: 30s
Health Check Timeout: 10s
Health Check Retries: 3
```

### 8. Desplegar

1. Revisa toda la configuración
2. Haz clic en **"Deploy"**
3. Espera a que se complete el build (puede tomar 2-5 minutos)
4. Una vez completado, verás el estado "Running"

### 9. Acceder a tu Aplicación

Easy Panel te proporcionará una URL como:
```
https://transcribir.your-domain.easypanel.host
```

¡Tu aplicación ya está en vivo! 🎉

## 🔄 Despliegues Automáticos (CI/CD)

### Configurar Webhook de GitHub

Para que Easy Panel despliegue automáticamente cuando hagas push:

1. En Easy Panel, ve a la configuración de tu servicio
2. Copia la **Webhook URL**
3. Ve a tu repositorio en GitHub
4. Settings → Webhooks → Add webhook
5. Pega la URL del webhook
6. Selecciona "application/json" como Content type
7. Selecciona los eventos: "Push" y "Pull request"
8. Guarda el webhook

Ahora cada push a tu rama desplegará automáticamente.

## 📊 Monitoreo

### Ver Logs

En Easy Panel:
1. Ve a tu servicio
2. Haz clic en la pestaña "Logs"
3. Verás los logs en tiempo real

### Verificar Health

Accede a: `https://tu-dominio/health`

Deberías ver: `healthy`

## 🔧 Solución de Problemas

### El build falla

**Problema:** Error durante el build de Docker

**Solución:**
1. Verifica que el archivo `Dockerfile` esté en la raíz del repositorio
2. Revisa los logs de build en Easy Panel
3. Asegúrate de que todas las dependencias en `package.json` sean correctas

### La aplicación no inicia

**Problema:** El contenedor se reinicia constantemente

**Solución:**
1. Verifica que el puerto 80 esté correctamente configurado
2. Revisa los logs del contenedor
3. Asegúrate de que nginx.conf esté presente

### Variables de entorno no funcionan

**Problema:** La API de Gemini no responde

**Solución:**
1. Verifica que `GEMINI_API_KEY` esté configurada en la sección "Environment Variables"
2. Asegúrate de que la API key sea válida
3. Revisa los logs del contenedor para ver si la variable se está inyectando correctamente
4. Si cambias la variable de entorno, reinicia el contenedor (no necesitas rebuild)

### Rebuild manual

Si necesitas forzar un rebuild:
1. Ve a tu servicio en Easy Panel
2. Haz clic en "Rebuild"
3. Espera a que complete el proceso

## 🔐 Seguridad

### Recomendaciones

1. **API Keys:** Nunca incluyas API keys en el código. Usa siempre variables de entorno.

2. **HTTPS:** Easy Panel provee HTTPS automáticamente con Let's Encrypt.

3. **Rate Limiting:** Considera implementar rate limiting en el frontend para evitar uso excesivo de la API de Gemini.

4. **CORS:** Si planeas usar un dominio personalizado, verifica la configuración de CORS.

### Para Producción

⚠️ **IMPORTANTE:** Esta aplicación incluye la API key en el bundle del frontend, lo cual NO es ideal para producción.

Para una aplicación en producción, considera:
1. Implementar un backend que maneje las llamadas a Gemini
2. Usar autenticación de usuarios
3. Implementar rate limiting en el servidor
4. Monitorear el uso de la API

## 📈 Escalado

### Escalar Horizontalmente

Si necesitas manejar más tráfico:
1. En Easy Panel, ve a la configuración del servicio
2. Aumenta el número de réplicas
3. Easy Panel balanceará la carga automáticamente

### Escalar Verticalmente

Para dar más recursos a cada instancia:
1. Aumenta la memoria y CPU asignadas
2. Haz un redeploy

## 🎓 Recursos Adicionales

- [Documentación de Easy Panel](https://easypanel.io/docs)
- [Documentación de Gemini API](https://ai.google.dev/docs)
- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Nginx](https://nginx.org/en/docs/)

## 💬 Soporte

Si tienes problemas:
1. Revisa los logs en Easy Panel
2. Verifica la configuración paso a paso
3. Consulta la documentación de Easy Panel
4. Abre un issue en el repositorio de GitHub

---

¡Feliz despliegue! 🚀
