# 🐦 Configuración de Twitter/X API

Esta guía te explica paso a paso cómo configurar X-WindyBot para publicar automáticamente las capturas del radar en Twitter/X.

## 📋 Requisitos Previos

- Una cuenta de Twitter/X
- Acceso a la [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- Permisos para crear aplicaciones en Twitter

## 🚀 Paso 1: Crear una Aplicación en Twitter Developer Portal

### 1.1 Acceder al Developer Portal

1. Ve a [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Inicia sesión con tu cuenta de Twitter
3. Si es tu primera vez, solicita acceso a la API:
   - Haz clic en **"Sign up for Free Account"**
   - Completa el formulario explicando tu caso de uso:
     ```
     Purpose: Automated weather radar screenshots from Windy.com
     Will you make Twitter content available to a government entity: No
     ```
   - Acepta los términos y condiciones

### 1.2 Crear una Nueva App

1. En el Dashboard, haz clic en **"+ Create App"** o **"Create Project"**
2. Completa la información:
   - **App name**: `WindyBot Radar` (o el nombre que prefieras)
   - **Description**: `Automated weather radar screenshots`
   - **Website URL**: `https://github.com/jmtdev0/X-WindyBot`
   - **Callback URL**: Puedes dejarlo vacío o usar `http://localhost:3000`

3. Una vez creada, te mostrará las **API Keys**. **¡GUÁRDALAS INMEDIATAMENTE!**

### 1.3 Generar Tokens de Acceso

1. Ve a la pestaña **"Keys and tokens"** de tu aplicación
2. En la sección **"Authentication Tokens"**, haz clic en **"Generate"** para:
   - **API Key** (también llamada Consumer Key)
   - **API Secret** (también llamada Consumer Secret)
3. En la sección **"Access Token and Secret"**, haz clic en **"Generate"** para:
   - **Access Token**
   - **Access Token Secret**

**IMPORTANTE:** Guarda estos 4 valores en un lugar seguro. No los compartas con nadie.

### 1.4 Configurar Permisos de la App

1. Ve a la pestaña **"Settings"** de tu aplicación
2. En **"App permissions"**, asegúrate de que estén configurados como:
   - **Read and Write** (necesario para publicar tweets)
3. Si cambias los permisos, deberás regenerar los Access Tokens

## 🔐 Paso 2: Configurar Secrets en GitHub

### 2.1 Acceder a la Configuración de Secrets

1. Ve a tu repositorio: `https://github.com/jmtdev0/X-WindyBot`
2. Haz clic en **Settings** (⚙️)
3. En el menú lateral, ve a **Secrets and variables** → **Actions**
4. Selecciona la pestaña **Secrets** (no Variables)

### 2.2 Añadir los 4 Secrets

Crea estos 4 secrets uno por uno haciendo clic en **"New repository secret"**:

#### Secret 1: TWITTER_API_KEY
- **Name**: `TWITTER_API_KEY`
- **Secret**: Pega tu **API Key** (Consumer Key)
- Clic en **Add secret**

#### Secret 2: TWITTER_API_SECRET
- **Name**: `TWITTER_API_SECRET`
- **Secret**: Pega tu **API Secret** (Consumer Secret)
- Clic en **Add secret**

#### Secret 3: TWITTER_ACCESS_TOKEN
- **Name**: `TWITTER_ACCESS_TOKEN`
- **Secret**: Pega tu **Access Token**
- Clic en **Add secret**

#### Secret 4: TWITTER_ACCESS_SECRET
- **Name**: `TWITTER_ACCESS_SECRET`
- **Secret**: Pega tu **Access Token Secret**
- Clic en **Add secret**

### 2.3 Verificar los Secrets

Deberías ver algo como esto en la sección Secrets:

```
TWITTER_ACCESS_SECRET    Updated now
TWITTER_ACCESS_TOKEN     Updated now
TWITTER_API_KEY          Updated now
TWITTER_API_SECRET       Updated now
```

## ⚙️ Paso 3: Configurar Variables Opcionales (Personalización)

Puedes personalizar el mensaje del tweet usando Variables de Repositorio:

1. Ve a **Settings** → **Secrets and variables** → **Actions** → Pestaña **Variables**
2. Añade estas variables opcionales:

### Variable 1: TWITTER_INCLUDE_LINK (Opcional)
- **Name**: `TWITTER_INCLUDE_LINK`
- **Value**: `true` (por defecto) o `false` (para no incluir enlace a Windy)
- Si no se configura, por defecto incluirá el enlace

### Variable 2: TWITTER_CUSTOM_MESSAGE (Opcional)
- **Name**: `TWITTER_CUSTOM_MESSAGE`
- **Value**: Tu mensaje personalizado
- Ejemplo: `🌦️ Actualización del radar meteorológico en tiempo real`
- Si no se configura, usará el mensaje automático con fecha, hora y coordenadas

## 📝 Formato del Tweet por Defecto

Si no configuras `TWITTER_CUSTOM_MESSAGE`, el bot publicará:

```
🌧️ Radar meteorológico actualizado

📅 07/10/2025 - 14:30
📍 Lat 39.418, Lon -5.160

🔗 Ver en vivo: https://www.windy.com/?radar,39.418,-5.160,6

#Meteorología #Radar #Tiempo
```

## 🧪 Paso 4: Probar la Configuración

### 4.1 Prueba Local (Opcional)

Antes de ejecutar en GitHub Actions, puedes probar localmente:

```bash
# Windows PowerShell
$env:TWITTER_API_KEY="tu_api_key"
$env:TWITTER_API_SECRET="tu_api_secret"
$env:TWITTER_ACCESS_TOKEN="tu_access_token"
$env:TWITTER_ACCESS_SECRET="tu_access_secret"
npm run publish:twitter
```

### 4.2 Prueba en GitHub Actions

1. Primero, genera una captura:
   - Ve a **Actions** → **Captura Radar con Playwright**
   - Haz clic en **Run workflow**
   - Espera a que termine (verás la publicación en Twitter en los logs)

2. Verifica en Twitter:
   - Ve a tu perfil de Twitter
   - Deberías ver el tweet con la imagen del radar

## 🔄 Paso 5: Activar Publicación Automática (Opcional)

Si quieres que el bot publique cada 5-10 minutos automáticamente:

1. Edita `.github/workflows/capture-ultra-fast.yml`
2. Descomenta las líneas del `schedule`:

```yaml
schedule:
  # Ejecutar cada 10 minutos
  - cron: '*/10 * * * *'
```

**Opciones de frecuencia:**
- `*/5 * * * *` - Cada 5 minutos
- `*/10 * * * *` - Cada 10 minutos
- `*/15 * * * *` - Cada 15 minutos
- `0 * * * *` - Cada hora

## 🛠️ Solución de Problemas

### Error: "Authentication failed"

**Causa:** Credenciales incorrectas o permisos insuficientes.

**Solución:**
1. Verifica que los 4 secrets estén correctamente configurados en GitHub
2. Asegúrate de que la app tenga permisos **Read and Write**
3. Si cambiaste permisos, regenera los Access Tokens

### Error: "Rate limit exceeded"

**Causa:** Demasiadas publicaciones en poco tiempo.

**Solución:**
1. Twitter tiene límites de API (300 tweets cada 3 horas)
2. Aumenta el intervalo del cron a 15 o 30 minutos
3. Espera unos minutos y vuelve a intentar

### El workflow se ejecuta pero no publica

**Causa:** Secrets no configurados.

**Solución:**
1. Revisa los logs del workflow
2. Si ves `"Credenciales de Twitter no configuradas, saltando publicación"`, necesitas configurar los secrets
3. Asegúrate de haberlos añadido como **Secrets**, no como Variables

### La imagen no aparece en el tweet

**Causa:** Archivo de captura muy pequeño o corrupto.

**Solución:**
1. Verifica que las capturas sean > 10 KB
2. Revisa los logs del paso "Ejecutar captura con Playwright"
3. Descarga la captura del repositorio y ábrela manualmente para verificar

## 📊 Límites de la API de Twitter

Ten en cuenta estos límites al configurar la frecuencia:

| Acción | Límite |
|--------|--------|
| Tweets (User Context) | 300 tweets / 3 horas |
| Media uploads | 1 MB por imagen (PNG) |
| Tweet length | 280 caracteres |

## 🆘 Recursos Adicionales

- [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [twitter-api-v2 npm package](https://www.npmjs.com/package/twitter-api-v2)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## 🎯 Verificación Final

Checklist para confirmar que todo está configurado:

- [ ] Cuenta de Twitter Developer creada
- [ ] Aplicación creada en Developer Portal
- [ ] Permisos de la app configurados como "Read and Write"
- [ ] Los 4 secrets configurados en GitHub:
  - [ ] TWITTER_API_KEY
  - [ ] TWITTER_API_SECRET
  - [ ] TWITTER_ACCESS_TOKEN
  - [ ] TWITTER_ACCESS_SECRET
- [ ] Variables de coordenadas configuradas (RADAR_LAT, RADAR_LON, RADAR_ZOOM)
- [ ] Workflow ejecutado manualmente con éxito
- [ ] Tweet publicado correctamente en Twitter

---

💡 **Tip:** Si solo quieres probar sin publicar aún en Twitter, simplemente no configures los secrets. El workflow funcionará normalmente pero saltará la publicación en Twitter.
