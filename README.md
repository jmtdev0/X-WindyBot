# 🌦️ X-WindyBot - Capturador Automático de Radar Meteorológico

Una herramienta de automatización que utiliza GitHub Actions para capturar screenshots del radar meteorológico de Windy.com y publicarlos automáticamente en Twitter/X.

## 🚀 Características

- ⏰ **Captura automática cada 5-10 minutos** mediante GitHub Actions (cron + disparo manual)
- 🎭 **Motor Playwright** con soporte nativo para WebGL y renderizado de canvas
- 🎨 **Capturas de alta calidad** (50-800 KB) con preserveDrawingBuffer y canvas.toDataURL()
- 🐦 **Publicación automática en Twitter/X** con imagen adjunta y coordenadas
- 📍 **Coordenadas configurables** mediante Variables de Repositorio
- 🖥️ **Aplicación local en Express** para disparar capturas desde `localhost` con un clic
- 📁 **Almacenamiento automático** en `captures/` con limpieza de históricos (últimas 100 capturas)
- 🔄 **Auto-commit & push** de capturas versionadas en el repositorio
- 🚀 **Instalación simplificada** sin necesidad de drivers externos ni configuraciones complejas
- 📊 **Logging detallado** (tiempos, estados de canvas, validaciones) para depuración rápida

## 📂 Estructura del Proyecto

```
X-WindyBot/
├── .github/
│   └── workflows/
│       └── capture-ultra-fast.yml   # Workflow con Playwright + Twitter
├── server/
│   └── local-server.js              # Servidor Express para el modo localhost
├── scripts/
│   ├── capture-playwright.js        # Motor Playwright con soporte WebGL
│   ├── publish-to-twitter.js        # Publicación automática en Twitter/X
│   └── capture-selenium.js          # Motor Selenium (legacy, backup)
├── captures/                        # Carpeta donde se guardan las capturas
│   └── .gitkeep                     # Mantiene la carpeta en Git
├── package.json                     # Dependencias y scripts de NPM
├── TWITTER_SETUP.md                 # Guía de configuración de Twitter API
├── CONFIGURACION.md                 # Guía de coordenadas y personalización
└── README.md                        # Esta documentación
```

## ⚙️ Configuración

### 1. Requisitos Previos

- Repositorio de GitHub
- Permisos de escritura en el repositorio (para commits automáticos)
- Node.js 18+ instalado localmente (para pruebas locales)

### 2. Instalación y pruebas locales

```bash
# Clonar el repositorio
git clone https://github.com/jmtdev0/X-WindyBot.git
cd X-WindyBot

# Instalar dependencias Node.js
npm install

# Instalar navegador Playwright Chromium
npx playwright install chromium

# Ejecutar una captura (mismo código que GitHub Actions)
npm run capture

# Levantar la aplicación local en http://localhost:3000 (botón «Tomar captura»)
npm run start:local
```

> ℹ️ Playwright instala su propia versión de Chromium automáticamente. No necesitas instalar Chrome ni drivers externos.

## 🏠 Modo servidor local (Express + Playwright)

El comando `npm run start:local` levanta una micro-aplicación en Express que reutiliza exactamente el mismo motor Playwright que GitHub Actions. Úsala para depurar o generar capturas on-demand desde tu máquina:

1. Ejecuta `npm run start:local`
2. Abre `http://localhost:3000`
3. Pulsa **«📸 Tomar captura ahora»**
4. Revisa el panel de resultados y la previsualización. Las imágenes se guardan en la carpeta configurada (por defecto `captures/`).

### Variables de entorno útiles

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto donde escucha la app local. |
| `LOCAL_CAPTURES_DIR` | `./captures` | Carpeta donde se persisten las capturas al usar el modo local. |
| `WINDY_URL` | `https://www.windy.com/?radar,39.853,-3.807,7` | URL objetivo que abrirá Selenium (aplica tanto en local como en CI si exportas la variable). |
| `WINDOW_WIDTH` / `WINDOW_HEIGHT` | `1920` / `1080` | Resolución de la ventana virtual para la captura. |
| `WINDY_TIMEOUT_MS` | `45000` | Timeout global (carga de página / scripts) en milisegundos. |
| `WINDY_WAIT_MS` | `15000` | Tiempo adicional en milisegundos para asegurarse de que el radar renderice por completo. |

> 📝 La API REST local devuelve el resultado en JSON (`/capture`) y expone un endpoint de estado (`/status`). Las capturas se sirven como archivos estáticos en `/captures/<archivo>.png`.

### 3. Configuración de GitHub Actions

El workflow está configurado para ejecutarse automáticamente. No necesitas configuración adicional, pero puedes personalizar:

#### Configurar coordenadas del radar (Variables de Repositorio)

Las coordenadas del radar se configuran mediante **Variables de Repositorio** en GitHub:

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** → **Secrets and variables** → **Actions** → Pestaña **Variables**
3. Añade las siguientes variables (opcionales):
   - `RADAR_LAT`: Latitud (por defecto: `39.418`)
   - `RADAR_LON`: Longitud (por defecto: `-5.160`)
   - `RADAR_ZOOM`: Nivel de zoom (por defecto: `6`)

**Ejemplo de coordenadas:**
- Madrid: Lat `40.416`, Lon `-3.703`, Zoom `7`
- Barcelona: Lat `41.385`, Lon `2.173`, Zoom `7`
- Valencia: Lat `39.470`, Lon `-0.377`, Zoom `7`
- Sevilla: Lat `37.389`, Lon `-5.984`, Zoom `7`

Si no configuras estas variables, el workflow usará las coordenadas por defecto de Extremadura.

#### Cambiar coordenadas localmente

Para pruebas locales, puedes usar variables de entorno:

```bash
# Windows PowerShell
$env:RADAR_LAT="40.416"; $env:RADAR_LON="-3.703"; $env:RADAR_ZOOM="7"; npm run capture

# Linux/Mac
RADAR_LAT=40.416 RADAR_LON=-3.703 RADAR_ZOOM=7 npm run capture
```

#### Cambiar la frecuencia de captura

Edita el archivo `.github/workflows/capture-ultra-fast.yml` y modifica el cron schedule:

```yaml
schedule:
  # Cada 5 minutos (actual)
  - cron: '*/5 * * * *'
  
  # Ejemplos alternativos:
  # - cron: '0 * * * *'     # Cada hora
  # - cron: '0 */2 * * *'   # Cada 2 horas
  # - cron: '0 8-20 * * *'  # Cada hora de 8 AM a 8 PM
```

## 🎯 Uso

### Ejecución Automática

El bot se ejecuta automáticamente cada 5 minutos sin necesidad de intervención. Puedes ver las ejecuciones en:

1. Ve a tu repositorio en GitHub
2. Haz clic en la pestaña **Actions**
3. Selecciona el workflow **"📸 Captura Radar Meteorológico"**

### Ejecución Manual

Para ejecutar manualmente una captura:

1. Ve a **Actions** → **"📸 Captura Radar Meteorológico"**
2. Haz clic en **"Run workflow"**
3. Opcionalmente marca **"Limpiar archivos antiguos"** para una limpieza manual adicional (la limpieza automática ya mantiene 100 capturas)

### Ver Capturas

Las capturas se almacenan en la carpeta `captures/` con el formato:
```
radar_YYYY-MM-DD_HH-MM-SS.png
```

Ejemplo: `radar_2025-09-28_14-30-25.png`

## � Publicación Automática en Twitter/X

X-WindyBot puede publicar automáticamente las capturas del radar en Twitter/X. 

### Configurar Twitter (Opcional)

Si quieres habilitar la publicación en Twitter:

1. **Sigue la guía completa**: Lee [`TWITTER_SETUP.md`](TWITTER_SETUP.md) con instrucciones paso a paso
2. **Obtén credenciales**: Crea una app en [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
3. **Configura Secrets** en GitHub:
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_SECRET`

Una vez configurado, cada captura se publicará automáticamente con un tweet como:

```
🌧️ Radar meteorológico actualizado

📅 07/10/2025 - 14:30
📍 Lat 39.418, Lon -5.160

🔗 Ver en vivo: https://www.windy.com/?radar,39.418,-5.160,6

#Meteorología #Radar #Tiempo
```

### Personalizar el Mensaje del Tweet

Puedes personalizar el mensaje configurando la Variable de Repositorio:

- `TWITTER_CUSTOM_MESSAGE`: Tu mensaje personalizado
- `TWITTER_INCLUDE_LINK`: `true` o `false` (incluir enlace a Windy)

### Probar Publicación Localmente

```bash
# Windows PowerShell
$env:TWITTER_API_KEY="tu_key"; $env:TWITTER_API_SECRET="tu_secret"
$env:TWITTER_ACCESS_TOKEN="tu_token"; $env:TWITTER_ACCESS_SECRET="tu_secret"
npm run publish:twitter
```

**Nota:** Si no configuras los secrets de Twitter, el workflow funcionará normalmente pero saltará la publicación.

## �🔧 Personalización Avanzada

### Modificar Configuraciones de Captura

En `scripts/capture-playwright.js` puedes personalizar:

```javascript
const CONFIG = {
    // URL específica del radar
    url: 'https://www.windy.com/?radar,39.853,-3.807,7',

    // Resolución del viewport de Chromium
    viewport: {
        width: 1920,
        height: 1080
    },

    // Timeout global y espera específica para el radar (ms)
    timeout: 60000,
    waitForRadar: 30000
};
```

### Gestión de Archivos Antiguos

El sistema incluye limpieza automática de capturas antiguas:

```javascript
// Mantener solo los últimos 100 archivos (configuración por defecto)
await cleanOldCaptures(100);
```

**ℹ️ Configuración actual**: El bot mantiene automáticamente solo las **últimas 100 capturas** después de cada ejecución exitosa.

## 📊 Monitoreo y Logs

### Ver Estado de Ejecuciones

En la pestaña **Actions** de GitHub puedes:
- Ver el historial completo de ejecuciones
- Verificar logs detallados de cada captura
- Monitorear errores o fallos

### Logs Típicos

```
🚀 Iniciando captura del radar meteorológico...
📱 Iniciando navegador...
🌐 Navegando a Windy.com...
⏳ Esperando a que la página cargue completamente...
📸 Capturando screenshot...
✅ Screenshot guardado exitosamente: radar_2025-09-28_14-30-25.png
📊 Tamaño del archivo: 245 KB
🎉 ¡Captura completada exitosamente!
```

## 🛠️ Solución de Problemas

### Capturas vacías o pequeñas (< 10 KB)

**Síntomas**:
- Las capturas se generan pero están vacías o muestran contenido incompleto
- Archivos PNG de ~8 KB en lugar de 650-800 KB esperados
- El radar no se visualiza en la captura

**Causa**: Problemas con el renderizado de WebGL o tiempo insuficiente de carga

**Solución**:
1. **✅ Ya está corregido con Playwright** - Usa `preserveDrawingBuffer` y `canvas.toDataURL()`
2. **🔧 Aumenta el tiempo de espera** - Modifica `waitForRadar` en `CONFIG` (por defecto 30s)
3. **🔍 Verifica los logs** - Revisa que `preserveDrawingBuffer: true` aparezca en la consola
4. **� Reporta si persiste** - Con capturas de menos de 100 KB hay un problema

### Error de instalación de Playwright

**Síntomas**: 
- Falla `npx playwright install chromium`
- Error: "browserType.launch: Executable doesn't exist"

**Solución**: 
1. **Ejecuta con --with-deps**: `npx playwright install chromium --with-deps`
2. **Verifica permisos** de escritura en la carpeta del proyecto
3. **Limpia cache** de Playwright: `npx playwright uninstall --all` y reinstala

### El workflow no se ejecuta automáticamente

1. **Verifica que el repositorio sea público** o que tengas GitHub Pro/Team
2. **Comprueba los permisos** en Settings → Actions → General
3. **Revisa si hay errores** en la pestaña Actions

### Capturas en blanco o errores de carga

1. **Aumenta `waitForRadar`** en `scripts/capture-playwright.js` (por defecto 30s)
2. **Verifica la URL** de Windy.com en el CONFIG
3. **Revisa los logs** para errores específicos de Playwright
4. **Verifica estado del canvas** en los logs (debe mostrar `preserveDrawingBuffer: true`)

### El repositorio crece mucho

1. **La limpieza automática ya está activada** (mantiene 100 capturas)
2. **Ejecuta limpieza manual adicional** con la opción en "Run workflow"
3. **Reduce el límite de limpieza automática** editando el valor en `scripts/capture-native.sh`
4. **Reduce la frecuencia** de capturas modificando el cron schedule

### Falta de espacio en GitHub

GitHub ofrece 1GB gratis. Con capturas de ~250KB y máximo 100 archivos:
- **Máximo espacio usado**: 100 capturas × 250KB = ~25MB
- **Tiempo cubierto**: ~8.3 horas de historial continuo

**✅ Solución implementada**: La limpieza automática mantiene siempre solo las últimas 100 capturas.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Algunas ideas:

- 🌍 Soporte para múltiples ubicaciones
- 🐦 Integración con Twitter/X para publicación automática  
- 📱 Notificaciones cuando se detecten condiciones meteorológicas específicas
- 📈 Generación de GIFs animados con secuencias de capturas
- 🔍 Análisis automático de patrones meteorológicos
- 📅 Configuración de retención de capturas por días/horas en lugar de cantidad fija

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Créditos

- **[Windy.com](https://www.windy.com)** - Fuente de datos meteorológicos
- **[Playwright](https://playwright.dev/)** - Automatización de navegador con soporte WebGL
- **[GitHub Actions](https://github.com/features/actions)** - Plataforma de CI/CD

---

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:

1. 🐛 **Reporta bugs** en [Issues](https://github.com/jmtdev0/X-WindyBot/issues)
2. 💡 **Sugiere mejoras** en [Discussions](https://github.com/jmtdev0/X-WindyBot/discussions)
3. ⭐ **¡Dale una estrella** si te resulta útil!

---

<div align="center">

**🌦️ Mantente al día con el clima con X-WindyBot 🤖**

[🚀 Ver Actions](../../actions) | [📁 Ver Capturas](./captures) | [🐛 Reportar Bug](../../issues)

</div>