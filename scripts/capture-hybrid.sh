#!/bin/bash

# Script híbrido que prueba múltiples métodos para capturar Windy.com
# Orden de prioridad: 1) Chrome headless 2) wkhtmltoimage 3) Chromium

set -e

# Configuración
WINDY_URL="https://www.windy.com/-Weather-radar-radar?radar,39.853,-3.807,7"
CAPTURES_DIR="./captures"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILENAME="radar_${TIMESTAMP}.png"
FILEPATH="${CAPTURES_DIR}/${FILENAME}"

echo "🚀 Iniciando captura híbrida del radar meteorológico..."

# Crear directorio si no existe
mkdir -p "$CAPTURES_DIR"

echo "🔍 Probando métodos de captura por orden de prioridad..."

# Método 1: Chrome/Chromium headless (MÁS CONFIABLE PARA JS PESADO)
if command -v google-chrome-stable &> /dev/null; then
    echo "✅ Método 1: Usando Chrome headless (recomendado para Windy)"
    
    google-chrome-stable \
        --headless \
        --disable-gpu \
        --no-sandbox \
        --disable-setuid-sandbox \
        --disable-dev-shm-usage \
        --disable-extensions \
        --disable-plugins \
        --disable-background-timer-throttling \
        --disable-renderer-backgrounding \
        --disable-backgrounding-occluded-windows \
        --disable-features=TranslateUI,BlinkGenPropertyTrees \
        --window-size=1920,1080 \
        --virtual-time-budget=10000 \
        --run-all-compositor-stages-before-draw \
        --screenshot="$FILEPATH" \
        "$WINDY_URL"
        
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Método 1b: Usando Chromium headless"
    
    chromium-browser \
        --headless \
        --disable-gpu \
        --no-sandbox \
        --disable-setuid-sandbox \
        --disable-dev-shm-usage \
        --window-size=1920,1080 \
        --virtual-time-budget=10000 \
        --screenshot="$FILEPATH" \
        "$WINDY_URL"

# Método 2: wkhtmltoimage (con configuración optimizada)
elif command -v wkhtmltoimage &> /dev/null; then
    echo "✅ Método 2: Usando wkhtmltoimage optimizado"
    
    # Configurar display si no existe
    if [ -z "$DISPLAY" ]; then
        export DISPLAY=:99
        Xvfb :99 -screen 0 1920x1080x24 &
        XVFB_PID=$!
        sleep 2
    fi
    
    wkhtmltoimage \
        --width 1920 \
        --height 1080 \
        --format png \
        --quality 90 \
        --javascript-delay 10000 \
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
        
    # Limpiar Xvfb si lo iniciamos nosotros
    if [ ! -z "$XVFB_PID" ]; then
        kill $XVFB_PID 2>/dev/null || true
    fi

# Método 3: Instalar herramientas si no están disponibles
else
    echo "⚠️ No se encontraron herramientas, instalando..."
    
    # Detectar distribución e instalar
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y google-chrome-stable || sudo apt-get install -y chromium-browser
        
        # Reintentar con la herramienta recién instalada
        if command -v google-chrome-stable &> /dev/null; then
            echo "✅ Chrome instalado, ejecutando captura..."
            google-chrome-stable --headless --disable-gpu --no-sandbox --window-size=1920,1080 --virtual-time-budget=10000 --screenshot="$FILEPATH" "$WINDY_URL"
        elif command -v chromium-browser &> /dev/null; then
            echo "✅ Chromium instalado, ejecutando captura..."
            chromium-browser --headless --disable-gpu --no-sandbox --window-size=1920,1080 --virtual-time-budget=10000 --screenshot="$FILEPATH" "$WINDY_URL"
        fi
    else
        echo "❌ No se pudo instalar herramientas automáticamente"
        exit 1
    fi
fi

# Verificar resultado
if [ -f "$FILEPATH" ]; then
    FILESIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || stat -f%z "$FILEPATH" 2>/dev/null)
    FILESIZE_KB=$((FILESIZE / 1024))
    
    echo "✅ Screenshot guardado: $FILENAME"
    echo "📍 Ubicación: $FILEPATH" 
    echo "📊 Tamaño: ${FILESIZE_KB} KB"
    
    # Verificar que no sea un archivo muy pequeño (indica error)
    if [ "$FILESIZE" -lt 50000 ]; then  # Menos de 50KB probablemente es error
        echo "⚠️ Advertencia: Archivo muy pequeño, posible error en la captura"
        echo "🔍 Verificar contenido con: file '$FILEPATH'"
        # No salimos con error para permitir debug
    fi
    
    echo "🎉 Captura híbrida completada"
else
    echo "❌ Error: No se pudo crear el archivo de captura"
    exit 1
fi