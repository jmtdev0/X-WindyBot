# 🌦️ X-WindyBot - Capturador Automático de Radar Meteorológico

Una herramienta de automatización que utiliza GitHub Actions para capturar screenshots del radar meteorológico de Windy.com cada 5 minutos y almacenarlos automáticamente en el repositorio.

## 🚀 Características

- ⏰ **Captura automática cada 5 minutos** usando GitHub Actions con cron schedule
- 🖱️ **Ejecución manual** disponible desde la interfaz de GitHub Actions
- 🤖 **Puppeteer** para automatizar la navegación y captura de screenshots
- 📁 **Almacenamiento automático** en la carpeta `captures/` del repositorio 
- 🔄 **Auto-commit y push** de nuevas capturas
- 🧹 **Limpieza opcional** de archivos antiguos para mantener el repositorio ligero
- 📊 **Logging detallado** y resúmenes de ejecución

## 📂 Estructura del Proyecto

```
X-WindyBot/
├── .github/
│   └── workflows/
│       └── capture-radar.yml     # GitHub Actions workflow
├── scripts/
│   └── screenshot.js             # Script principal de captura
├── captures/                     # Carpeta donde se guardan los screenshots
│   └── .gitkeep                 # Mantiene la carpeta en Git
├── package.json                  # Dependencias y configuración del proyecto
└── README.md                     # Esta documentación
```

## ⚙️ Configuración

### 1. Requisitos Previos

- Repositorio de GitHub
- Permisos de escritura en el repositorio (para commits automáticos)

### 2. Instalación Local (Opcional)

Si quieres probar el script localmente:

```bash
# Clonar el repositorio
git clone https://github.com/jmtdev0/X-WindyBot.git
cd X-WindyBot

# Instalar dependencias
npm install

# Ejecutar captura manual
npm run screenshot
```

### 3. Configuración de GitHub Actions

El workflow está configurado para ejecutarse automáticamente. No necesitas configuración adicional, pero puedes personalizar:

#### Modificar la URL de Windy.com

Edita el archivo `scripts/screenshot.js` y cambia la variable `WINDY_URL`:

```javascript
const CONFIG = {
  // Personaliza esta URL según tu ubicación o preferencias
  WINDY_URL: 'https://www.windy.com/?rain,2023-10-01-12,40.416,-3.703,8',
  // ...
};
```

#### Cambiar la frecuencia de captura

Edita el archivo `.github/workflows/capture-radar.yml` y modifica el cron schedule:

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

## 🔧 Personalización Avanzada

### Modificar Configuraciones de Captura

En `scripts/screenshot.js` puedes personalizar:

```javascript
const CONFIG = {
  // URL específica del radar
  WINDY_URL: 'https://www.windy.com/...',
  
  // Resolución de captura
  VIEWPORT: {
    width: 1920,
    height: 1080
  },
  
  // Tiempo de espera para carga completa
  WAIT_TIME: 5000,
  
  // Elementos a ocultar en la captura
  ELEMENTS_TO_HIDE: [
    '#bottom',
    '.leaflet-control-container'
  ]
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

### Error "npm ci can only install packages when your package.json and package-lock.json are in sync"

**Síntomas**: 
- El workflow falla durante `npm ci` 
- Menciona dependencias faltantes en el lock file
- Error: "Missing: [package]@[version] from lock file"

**Solución**: 
1. **Ya está corregido** - El workflow ahora usa `npm install` siempre
2. **Generación automática** - Se genera un `package-lock.json` correcto automáticamente  
3. **Auto-commit** - El workflow commitea el lock file si es nuevo
4. **Cache optimizado** - Mejor gestión de dependencias en CI

### Error "Dependencies lock file is not found"

**Síntomas**: El workflow falla con mensaje sobre `package-lock.json` no encontrado.

**Solución**: 
1. **Ya está corregido** en la versión actual del workflow
2. El workflow usa `npm install` para generar el lock file automáticamente
3. Se commitea automáticamente para futuras ejecuciones

### El workflow no se ejecuta automáticamente

1. **Verifica que el repositorio sea público** o que tengas GitHub Pro/Team
2. **Comprueba los permisos** en Settings → Actions → General
3. **Revisa si hay errores** en la pestaña Actions

### Capturas en blanco o errores de carga

1. **Aumenta el WAIT_TIME** en `scripts/screenshot.js`
2. **Verifica la URL** de Windy.com (puede cambiar)
3. **Revisa los logs** para errores específicos de Puppeteer

### El repositorio crece mucho

1. **La limpieza automática ya está activada** (mantiene 100 capturas)
2. **Ejecuta limpieza manual adicional** con la opción en "Run workflow"
3. **Reduce el número máximo** editando el valor en `scripts/screenshot.js`
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
- **[Puppeteer](https://pptr.dev/)** - Automatización de navegador
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