#!/bin/bash

# Script alternativo ultra-rápido usando solo herramientas nativas
# No requiere Node.js, Puppeteer ni dependencias pesadas

set -e

# Configuración
WINDY_URL="https://www.windy.com/-Weather-radar-radar?radar,39.853,-3.807,7"
CAPTURES_DIR="./captures"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILENAME="radar_${TIMESTAMP}.png"
FILEPATH="${CAPTURES_DIR}/${FILENAME}"

echo "🚀 Iniciando captura ultra-rápida del radar meteorológico..."

# Crear directorio si no existe
mkdir -p "$CAPTURES_DIR"

echo "📦 Verificando herramientas disponibles..."

# Verificar herramientas disponibles
if command -v wkhtmltoimage &> /dev/null; then
    echo "✅ Usando wkhtmltoimage"
    
    echo "🌐 Capturando desde Windy.com..."
    wkhtmltoimage \
        --width 1920 \
        --height 1080 \
        --format png \
        --quality 90 \
        --javascript-delay 8000 \
        --no-stop-slow-scripts \
        --debug-javascript \
        --enable-javascript \
        --load-error-handling ignore \
        --load-media-error-handling ignore \
        --enable-local-file-access \
        --disable-smart-shrinking \
        --custom-header Accept-Language "en-US,en;q=0.9" \
        --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
        "$WINDY_URL" \
        "$FILEPATH"
        
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Usando Chromium headless"
    
    echo "🌐 Capturando desde Windy.com..."
    chromium-browser \
        --headless \
        --disable-gpu \
        --no-sandbox \
        --disable-setuid-sandbox \
        --window-size=1920,1080 \
        --screenshot="$FILEPATH" \
        "$WINDY_URL"
        
elif command -v google-chrome &> /dev/null; then
    echo "✅ Usando Chrome headless"
    
    echo "🌐 Capturando desde Windy.com..."
    google-chrome \
        --headless \
        --disable-gpu \
        --no-sandbox \
        --disable-setuid-sandbox \
        --window-size=1920,1080 \
        --screenshot="$FILEPATH" \
        "$WINDY_URL"
        
else
    echo "❌ No se encontraron herramientas de captura disponibles"
    echo "Instalando wkhtmltopdf..."
    
    sudo apt-get update -qq
    sudo apt-get install -y wkhtmltopdf xvfb
    
    # Configurar display virtual
    export DISPLAY=:99
    Xvfb :99 -screen 0 1920x1080x24 &
    sleep 2
    
    echo "🌐 Capturando desde Windy.com..."
    wkhtmltoimage \
        --width 1920 \
        --height 1080 \
        --format png \
        --quality 90 \
        --javascript-delay 8000 \
        --no-stop-slow-scripts \
        --debug-javascript \
        --enable-javascript \
        --load-error-handling ignore \
        --load-media-error-handling ignore \
        --enable-local-file-access \
        --disable-smart-shrinking \
        --custom-header Accept-Language "en-US,en;q=0.9" \
        --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
        "$WINDY_URL" \
        "$FILEPATH"
fi

# Verificar que se creó el archivo
if [ -f "$FILEPATH" ]; then
    FILESIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || stat -f%z "$FILEPATH" 2>/dev/null)
    FILESIZE_KB=$((FILESIZE / 1024))
    
    echo "✅ Screenshot guardado exitosamente: $FILENAME"
    echo "📍 Ubicación: $FILEPATH" 
    echo "📊 Tamaño del archivo: ${FILESIZE_KB} KB"
    
    if [ "$FILESIZE" -lt 1000 ]; then
        echo "⚠️  Advertencia: El archivo parece muy pequeño, posible error en la captura"
        exit 1
    fi
    
    echo "🎉 ¡Captura completada exitosamente!"
else
    echo "❌ Error: No se pudo crear el archivo de captura"
    exit 1
fi