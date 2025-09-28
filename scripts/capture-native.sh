#!/bin/bash

# Script híbrido optimizado para Windy.com con debugging avanzado
# Prioriza Chrome headless para sitios JavaScript pesados

set -e

# Configuración - URL optimizada para carga más rápida
WINDY_URL="https://www.windy.com/?radar,39.853,-3.807,7"
CAPTURES_DIR="./captures"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILENAME="radar_${TIMESTAMP}.png"
FILEPATH="${CAPTURES_DIR}/${FILENAME}"

echo "🚀 Iniciando captura híbrida del radar meteorológico..."
echo "🔍 URL objetivo: $WINDY_URL"
echo "📍 Archivo destino: $FILEPATH"

# Crear directorio si no existe
mkdir -p "$CAPTURES_DIR"

echo "📦 Detectando herramientas disponibles..."

# Función para probar Chrome headless (PRIORIDAD 1)
try_chrome_headless() {
    local chrome_cmd=""
    
    if command -v google-chrome-stable &> /dev/null; then
        chrome_cmd="google-chrome-stable"
    elif command -v google-chrome &> /dev/null; then
        chrome_cmd="google-chrome"
    elif command -v chromium-browser &> /dev/null; then
        chrome_cmd="chromium-browser"
    elif command -v chromium &> /dev/null; then
        chrome_cmd="chromium"
    else
        echo "❌ Chrome/Chromium no encontrado"
        return 1
    fi
    
    echo "✅ Usando Chrome headless: $chrome_cmd"
    echo "🌐 Esperando carga completa de Windy.com (15 segundos)..."
    
    # Configuración Chrome optimizada para Windy.com
    $chrome_cmd \
        --headless \
        --no-sandbox \
        --disable-gpu \
        --disable-dev-shm-usage \
        --disable-extensions \
        --disable-plugins \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding \
        --disable-features=TranslateUI \
        --disable-ipc-flooding-protection \
        --window-size=1920,1080 \
        --virtual-time-budget=15000 \
        --run-all-compositor-stages-before-draw \
        --screenshot="$FILEPATH" \
        "$WINDY_URL" 2>&1 | tee chrome_debug.log || return 1
        
    return 0
}

# Función para wkhtmltoimage mejorado (FALLBACK)
try_wkhtmltoimage_enhanced() {
    if ! command -v wkhtmltoimage &> /dev/null; then
        echo "❌ wkhtmltoimage no encontrado"
        return 1
    fi
    
    echo "⚠️  Usando wkhtmltoimage (fallback) - delay extendido para Windy..."
    echo "🌐 Esperando JavaScript por 15 segundos..."
    
    wkhtmltoimage \
        --width 1920 \
        --height 1080 \
        --format png \
        --quality 90 \
        --javascript-delay 15000 \
        --no-stop-slow-scripts \
        --enable-javascript \
        --load-error-handling ignore \
        --load-media-error-handling ignore \
        "$WINDY_URL" \
        "$FILEPATH" 2>&1 | tee wkhtmltoimage_debug.log || return 1
        
    return 0
}

# Intentar métodos en orden de prioridad
echo "🎯 Intentando captura con Chrome headless..."
if try_chrome_headless; then
    METHOD="Chrome headless"
elif echo "🔄 Chrome falló, probando wkhtmltoimage mejorado..." && try_wkhtmltoimage_enhanced; then
    METHOD="wkhtmltoimage (enhanced)"
        
else
    echo "❌ Todos los métodos fallaron"
    echo "📋 Instalando herramientas como último recurso..."
    
    # Instalar Chrome si no existe
    echo "🔧 Instalando Google Chrome..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add - || true
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' || true
    sudo apt-get update -qq || true
    sudo apt-get install -y google-chrome-stable || true
    
    # Reintentar Chrome
    if try_chrome_headless; then
        METHOD="Chrome headless (instalado)"
    else
        echo "💥 Error crítico: No se pudo capturar con ningún método"
        exit 1
    fi
fi

# Verificar resultado y generar reporte detallado
echo ""
echo "🔍 === ANÁLISIS DE RESULTADO ==="

if [ -f "$FILEPATH" ]; then
    FILESIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || stat -f%z "$FILEPATH" 2>/dev/null)
    FILESIZE_KB=$((FILESIZE / 1024))
    
    echo "✅ Screenshot creado: $FILENAME"
    echo "📍 Ubicación: $FILEPATH" 
    echo "📊 Tamaño: ${FILESIZE_KB} KB"
    echo "🛠️  Método usado: $METHOD"
    
    # Análisis de calidad del archivo
    if [ "$FILESIZE" -lt 1000 ]; then
        echo "❌ PROBLEMA: Archivo muy pequeño (<1KB) - captura fallida"
        exit 1
    elif [ "$FILESIZE" -lt 100000 ]; then
        echo "⚠️  ALERTA: Archivo pequeño (<100KB) - posible contenido vacío"
        echo "📝 Esto suele indicar que la página no cargó completamente"
    elif [ "$FILESIZE" -gt 5000000 ]; then
        echo "✅ EXCELENTE: Archivo grande (${FILESIZE_KB}KB) - likely contenido rico"
    else
        echo "✅ BIEN: Tamaño razonable (${FILESIZE_KB}KB) - contenido probable"
    fi
    
    # Información adicional de debugging
    echo ""
    echo "📋 === INFORMACIÓN DE DEBUG ==="
    echo "🕐 Timestamp: $(date -u)"
    echo "🌍 URL capturada: $WINDY_URL"
    echo "📐 Resolución: 1920x1080"
    
    # Verificar si existen logs de debug
    if [ -f "chrome_debug.log" ]; then
        echo "📄 Chrome debug log disponible"
        if grep -q "ERROR\|FATAL\|Failed" chrome_debug.log; then
            echo "⚠️  Se encontraron errores en Chrome:"
            grep "ERROR\|FATAL\|Failed" chrome_debug.log | head -3
        fi
    fi
    
    if [ -f "wkhtmltoimage_debug.log" ]; then
        echo "📄 wkhtmltoimage debug log disponible"
        if grep -q "Error\|Failed" wkhtmltoimage_debug.log; then
            echo "⚠️  Se encontraron errores en wkhtmltoimage:"
            grep "Error\|Failed" wkhtmltoimage_debug.log | head -3
        fi
    fi
    
    echo ""
    echo "🎉 ¡Captura completada con método: $METHOD!"
    
else
    echo "❌ FALLO CRÍTICO: No se creó el archivo de captura"
    echo "🔍 Verificando directorio..."
    ls -la "$CAPTURES_DIR" || echo "El directorio no existe"
    
    echo "📋 Logs disponibles:"
    [ -f "chrome_debug.log" ] && echo "- chrome_debug.log ($(wc -l < chrome_debug.log) líneas)"
    [ -f "wkhtmltoimage_debug.log" ] && echo "- wkhtmltoimage_debug.log ($(wc -l < wkhtmltoimage_debug.log) líneas)"
    
    exit 1
fi