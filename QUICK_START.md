# 🎯 Resumen Rápido: X-WindyBot con Twitter

## ¿Qué hace este bot?

1. ⏱️ **Cada 5-10 minutos** (configurable)
2. 📸 Captura una imagen del radar meteorológico de Windy.com
3. 💾 Guarda la imagen en el repositorio (`captures/`)
4. 🐦 Publica automáticamente en Twitter/X con la imagen
5. 🧹 Limpia capturas antiguas (mantiene últimas 100)

## 📋 Checklist de Configuración

### Configuración Básica (Obligatoria)

- [ ] **Repositorio clonado** y dependencies instaladas (`npm install`)
- [ ] **Playwright instalado** (`npx playwright install chromium`)
- [ ] **Workflow activado** en GitHub Actions

### Configuración de Coordenadas (Recomendada)

- [ ] **Variables de Repositorio configuradas** en GitHub:
  - [ ] `RADAR_LAT` (ejemplo: `39.418`)
  - [ ] `RADAR_LON` (ejemplo: `-5.160`)
  - [ ] `RADAR_ZOOM` (ejemplo: `6`)

📖 Guía completa: [`CONFIGURACION.md`](CONFIGURACION.md)

### Configuración de Twitter (Opcional pero Recomendada)

- [ ] **Cuenta de Twitter Developer** creada
- [ ] **Aplicación creada** en Developer Portal
- [ ] **Permisos configurados** como "Read and Write"
- [ ] **Secrets configurados** en GitHub:
  - [ ] `TWITTER_API_KEY`
  - [ ] `TWITTER_API_SECRET`
  - [ ] `TWITTER_ACCESS_TOKEN`
  - [ ] `TWITTER_ACCESS_SECRET`

📖 Guía completa: [`TWITTER_SETUP.md`](TWITTER_SETUP.md)

## 🚀 Inicio Rápido

### 1. Clonar e Instalar

```bash
git clone https://github.com/jmtdev0/X-WindyBot.git
cd X-WindyBot
npm install
npx playwright install chromium
```

### 2. Configurar Coordenadas (GitHub)

1. Ve a **Settings** → **Secrets and variables** → **Actions** → **Variables**
2. Añade: `RADAR_LAT`, `RADAR_LON`, `RADAR_ZOOM`

### 3. Configurar Twitter (Opcional - GitHub)

1. Crea app en [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Ve a **Settings** → **Secrets and variables** → **Actions** → **Secrets**
3. Añade los 4 secrets de Twitter

### 4. Probar Localmente

```bash
# Captura local
npm run capture

# Publicación local (necesita credenciales)
npm run publish:twitter
```

### 5. Activar Workflow Automático

Edita `.github/workflows/capture-ultra-fast.yml`:

```yaml
on:
  schedule:
    # Descomentar para activar (cada 10 minutos)
    - cron: '*/10 * * * *'
  
  workflow_dispatch:
    # ...
```

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions Trigger                                 │
│  (Schedule: cada 10min O Manual: workflow_dispatch)     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  1. Checkout Repositorio                                │
│     - Descarga código fuente                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  2. Instalar Dependencias                               │
│     - npm install                                       │
│     - npx playwright install chromium --with-deps       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  3. Capturar Radar (Playwright)                         │
│     - Leer coordenadas: RADAR_LAT, RADAR_LON, RADAR_ZOOM│
│     - Navegar a Windy.com                               │
│     - Esperar 30s a que WebGL renderice                 │
│     - Capturar canvas con toDataURL()                   │
│     - Guardar en captures/radar_TIMESTAMP.png           │
│     - Validar tamaño > 10KB                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  4. Publicar en Twitter (Si está configurado)           │
│     - Leer credenciales: TWITTER_API_KEY, etc.          │
│     - Subir imagen a Twitter                            │
│     - Generar mensaje con fecha/hora/coordenadas        │
│     - Publicar tweet con imagen                         │
│     - Mostrar URL del tweet en logs                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  5. Limpieza Automática                                 │
│     - Contar archivos en captures/                      │
│     - Si > 100: eliminar los más antiguos               │
│     - Mantener solo las últimas 100 capturas            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  6. Commit y Push                                       │
│     - git add captures/                                 │
│     - git commit -m "Captura radar..."                  │
│     - git push                                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  ✅ COMPLETADO                                          │
│  - Captura guardada en repo                             │
│  - Tweet publicado (si configurado)                     │
│  - Logs disponibles en Actions                          │
└─────────────────────────────────────────────────────────┘
```

## 📊 Variables y Secrets

### Variables de Repositorio (Settings → Variables)

| Variable | Descripción | Por defecto | Ejemplo |
|----------|-------------|-------------|---------|
| `RADAR_LAT` | Latitud del radar | `39.418` | `40.416` |
| `RADAR_LON` | Longitud del radar | `-5.160` | `-3.703` |
| `RADAR_ZOOM` | Nivel de zoom | `6` | `7` |
| `TWITTER_INCLUDE_LINK` | Incluir enlace a Windy | `true` | `false` |
| `TWITTER_CUSTOM_MESSAGE` | Mensaje personalizado | Auto | Tu mensaje |

### Secrets de Repositorio (Settings → Secrets)

| Secret | Descripción | Dónde obtenerlo |
|--------|-------------|-----------------|
| `TWITTER_API_KEY` | API Key / Consumer Key | Twitter Developer Portal |
| `TWITTER_API_SECRET` | API Secret / Consumer Secret | Twitter Developer Portal |
| `TWITTER_ACCESS_TOKEN` | Access Token | Twitter Developer Portal |
| `TWITTER_ACCESS_SECRET` | Access Token Secret | Twitter Developer Portal |

## 🧪 Comandos Útiles

```bash
# Captura local
npm run capture

# Publicar en Twitter (local)
npm run publish:twitter

# Servidor local (UI web en localhost:3000)
npm run start:local

# Ver logs del workflow
# → GitHub.com → Actions → Ver última ejecución
```

## 📁 Estructura de Archivos Clave

```
X-WindyBot/
├── scripts/
│   ├── capture-playwright.js      ← Motor de captura
│   └── publish-to-twitter.js      ← Motor de publicación
├── .github/workflows/
│   └── capture-ultra-fast.yml     ← Workflow principal
├── captures/
│   └── radar_*.png                ← Capturas guardadas
├── TWITTER_SETUP.md               ← Guía Twitter API
├── CONFIGURACION.md               ← Guía coordenadas
└── README.md                      ← Documentación principal
```

## 🎉 Resultado Final

### En el Repositorio
- Carpeta `captures/` con imágenes del radar (máx 100)
- Commits automáticos cada vez que se genera una captura

### En Twitter
- Tweets automáticos con:
  - 🖼️ Imagen del radar
  - 📅 Fecha y hora
  - 📍 Coordenadas
  - 🔗 Enlace a Windy.com
  - #️⃣ Hashtags relevantes

### En GitHub Actions
- Logs detallados de cada ejecución
- Historial de capturas y publicaciones
- Debugging en caso de errores

## ❓ Preguntas Frecuentes

**¿Puedo usar el bot sin Twitter?**
Sí, simplemente no configures los secrets de Twitter. El bot capturará y guardará las imágenes normalmente.

**¿Cuánto cuesta?**
- GitHub Actions: **Gratis** (2000 minutos/mes en plan gratuito)
- Twitter API: **Gratis** (Basic tier permite hasta 300 tweets cada 3 horas)
- Playwright: **Gratis** y open source

**¿Cuántas veces puedo publicar?**
Con la API gratuita de Twitter: hasta 300 tweets cada 3 horas. Si usas cada 10 minutos, son 18 tweets/hora = ~54 tweets cada 3 horas (bien dentro del límite).

**¿Puedo cambiar la ubicación del radar?**
Sí, solo cambia las variables `RADAR_LAT`, `RADAR_LON`, `RADAR_ZOOM` en Settings → Variables.

**¿Cómo desactivo las publicaciones automáticas?**
Comenta las líneas del `schedule` en el workflow, o elimina los secrets de Twitter.

## 🆘 Soporte

- 📖 **Documentación completa**: [`README.md`](README.md)
- 🐦 **Setup Twitter**: [`TWITTER_SETUP.md`](TWITTER_SETUP.md)
- 📍 **Configuración**: [`CONFIGURACION.md`](CONFIGURACION.md)
- 🐛 **Reportar problemas**: [GitHub Issues](https://github.com/jmtdev0/X-WindyBot/issues)

---

**¡Listo para empezar!** 🚀 Sigue el checklist de arriba y tendrás tu bot funcionando en menos de 30 minutos.
