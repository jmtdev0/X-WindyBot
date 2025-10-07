#!/usr/bin/env node

/**
 * Script de captura para Windy.com usando Playwright
 * Playwright tiene mejor soporte para WebGL en modo headless que Selenium
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Leer coordenadas desde variables de entorno o usar valores por defecto
const RADAR_LAT = process.env.RADAR_LAT || '39.418';
const RADAR_LON = process.env.RADAR_LON || '-5.160';
const RADAR_ZOOM = process.env.RADAR_ZOOM || '6';

// Configuración
const CONFIG = {
    url: `https://www.windy.com/?radar,${RADAR_LAT},${RADAR_LON},${RADAR_ZOOM}`,
    capturesDir: './captures',
    timeout: 60000,
    waitForRadar: 30000,
    viewport: { width: 1920, height: 1080 }
};

class WindyPlaywrightCapture {
    constructor(customConfig = {}) {
        this.config = { ...CONFIG, ...customConfig };
        this.browser = null;
        this.page = null;
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        this.filename = `radar_${this.timestamp}.png`;
        this.filepath = path.join(this.config.capturesDir, this.filename);
    }

    async setupBrowser() {
        console.log('🚀 Iniciando Playwright con Chromium...');
        
        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        this.page = await this.browser.newPage({
            viewport: this.config.viewport,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        });

        // CRÍTICO: Inyectar código que force preserveDrawingBuffer en WebGL
        await this.page.addInitScript(() => {
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes = {}) {
                if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
                    // Forzar preserveDrawingBuffer para que podamos capturar el canvas
                    contextAttributes.preserveDrawingBuffer = true;
                    console.log('[X-WindyBot] Forzando preserveDrawingBuffer=true para WebGL');
                }
                return originalGetContext.call(this, contextType, contextAttributes);
            };
        });

        // Configurar timeouts
        this.page.setDefaultTimeout(this.config.timeout);
        this.page.setDefaultNavigationTimeout(this.config.timeout);

        console.log('✅ Navegador configurado correctamente');
    }

    async navigateToWindy() {
        console.log('🌐 Navegando a Windy.com...');
        console.log(`📍 URL: ${this.config.url}`);

        await this.page.goto(this.config.url, {
            waitUntil: 'domcontentloaded'
        });

        console.log('✅ Página cargada');
    }

    async waitForWindyToLoad() {
        console.log(`⏳ Esperando a que el radar se cargue...`);
        
        // Esperar a que exista un canvas
        try {
            await this.page.waitForSelector('canvas', { timeout: 10000 });
            console.log('🗺️ Canvas detectado en la página');
        } catch (err) {
            console.log('⚠️ No se detectó canvas, continuando de todas formas...');
        }

        // Esperar elementos específicos de Windy que indiquen carga completa
        console.log('⏳ Esperando elementos de interfaz de Windy...');
        
        try {
            // Esperar a que aparezcan controles de la UI de Windy
            await this.page.waitForSelector('#map-container, .leaflet-container, [class*="map"]', { 
                timeout: 10000,
                state: 'visible'
            });
            console.log('✅ Contenedor del mapa detectado');
        } catch (err) {
            console.log('⚠️ No se detectó contenedor del mapa');
        }

        // Espera generosa para que se renderice todo
        console.log(`⏳ Esperando ${this.config.waitForRadar / 1000}s adicionales para renderizado completo...`);
        await this.page.waitForTimeout(this.config.waitForRadar);

        // Verificar estado final de WebGL
        const canvasInfo = await this.page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return { found: false, error: 'No canvas element' };

            try {
                const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
                if (!gl) {
                    return { 
                        found: false, 
                        error: 'No WebGL context',
                        width: canvas.width,
                        height: canvas.height
                    };
                }

                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
                const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';

                // Información del estado de WebGL
                const contextAttributes = gl.getContextAttributes();

                return {
                    found: true,
                    width: canvas.width,
                    height: canvas.height,
                    hasWebGL: true,
                    renderer,
                    vendor,
                    preserveDrawingBuffer: contextAttributes.preserveDrawingBuffer,
                    antialias: contextAttributes.antialias
                };
            } catch (err) {
                return { found: false, error: err.message };
            }
        });

        console.log('🗺️ Estado del canvas:', JSON.stringify(canvasInfo));
        console.log('✅ Tiempo de espera completado');

        return canvasInfo;
    }

    async optimizeForScreenshot() {
        console.log('🎨 Optimizando interfaz para captura...');

        try {
            await this.page.evaluate(() => {
                // Ocultar elementos de UI que puedan interferir
                const selectorsToHide = [
                    '.cookie', '.popup', '.modal', '.advertisement',
                    '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
                    '[class*="banner"]', '[class*="overlay"]', '[class*="ad-"]'
                ];

                selectorsToHide.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (el) el.style.display = 'none';
                    });
                });

                console.log('UI optimizada para captura');
            });

            console.log('✅ Interfaz optimizada');
        } catch (error) {
            console.log('⚠️ No se pudo optimizar la interfaz:', error.message);
        }
    }

    async takeScreenshot() {
        console.log('📸 Tomando captura de pantalla...');

        // Asegurar que el directorio existe
        await fs.mkdir(this.config.capturesDir, { recursive: true });

        // Esperar un frame adicional para asegurar que WebGL ha renderizado
        console.log('   ⏳ Esperando frame final de WebGL...');
        await this.page.waitForTimeout(2000);

        // Verificar el estado del canvas justo antes de capturar
        const canvasCheck = await this.page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return { found: false };
            
            // Intentar forzar un render
            const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (ctx) {
                ctx.flush();
                ctx.finish();
            }
            
            return {
                found: true,
                width: canvas.width,
                height: canvas.height,
                hasContent: canvas.width > 0 && canvas.height > 0
            };
        });
        console.log('   🔍 Estado del canvas pre-captura:', JSON.stringify(canvasCheck));

        // Método 1: Captura directa del canvas (más confiable para WebGL)
        try {
            console.log('   Método 1: Captura directa del canvas con toDataURL()...');
            const canvasDataUrl = await this.page.evaluate(() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                
                try {
                    // Intentar capturar el canvas
                    return canvas.toDataURL('image/png');
                } catch (err) {
                    console.error('Error en toDataURL:', err);
                    return null;
                }
            });

            if (canvasDataUrl && canvasDataUrl.length > 1000) {
                // Convertir data URL a buffer
                const base64Data = canvasDataUrl.replace(/^data:image\/png;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                await fs.writeFile(this.filepath, buffer);
                const stats = await fs.stat(this.filepath);
                console.log(`✅ Captura guardada desde canvas: ${this.filename} (${Math.round(stats.size/1024)} KB)`);
                
                if (stats.size > 10000) {
                    return this.filepath;
                } else {
                    console.log(`⚠️ Captura muy pequeña, intentando método alternativo...`);
                }
            } else {
                console.log(`⚠️ Canvas dataURL vacío o muy pequeño (longitud: ${canvasDataUrl ? canvasDataUrl.length : 0})`);
            }
        } catch (err) {
            console.log(`⚠️ Falló captura directa del canvas: ${err.message}`);
        }

        // Método 2: Screenshot de página (fallback)
        try {
            console.log('   Método 2: Screenshot de página completa...');
            await this.page.screenshot({
                path: this.filepath,
                fullPage: false,
                type: 'png',
                animations: 'disabled'
            });
            
            const stats = await fs.stat(this.filepath);
            console.log(`✅ Captura guardada vía screenshot: ${this.filename} (${Math.round(stats.size/1024)} KB)`);
            
            if (stats.size > 10000) {
                return this.filepath;
            } else {
                console.log(`⚠️ Screenshot muy pequeño (${stats.size} bytes)`);
            }
        } catch (err) {
            console.log(`⚠️ Falló screenshot de página: ${err.message}`);
        }

        // Si llegamos aquí, algo salió mal
        throw new Error('Todos los métodos de captura fallaron - archivos demasiado pequeños');
    }

    async getPageInfo() {
        try {
            const title = await this.page.title();
            const url = this.page.url();

            console.log(`📄 Título de página: ${title}`);
            console.log(`🔗 URL actual: ${url}`);

            return { title, url };
        } catch (error) {
            console.log('⚠️ No se pudo obtener información de la página');
            return null;
        }
    }

    async cleanup() {
        if (this.browser) {
            console.log('🧹 Cerrando navegador...');
            await this.browser.close();
        }
    }

    async validateScreenshot() {
        try {
            const stats = await fs.stat(this.filepath);
            const sizeKB = Math.round(stats.size / 1024);

            console.log(`📊 Tamaño del archivo: ${sizeKB} KB`);

            if (stats.size < 10000) {
                console.log('⚠️ Archivo muy pequeño, posible error en la captura');
                return false;
            }

            console.log('✅ Captura validada correctamente');
            return true;

        } catch (error) {
            console.log('❌ Error validando la captura:', error.message);
            return false;
        }
    }
}

async function runPlaywrightCapture(customConfig = {}) {
    const capture = new WindyPlaywrightCapture(customConfig);
    const result = {
        success: false,
        validationPassed: false,
        filepath: capture.filepath,
        filename: capture.filename,
        timestamp: capture.timestamp,
        pageInfo: null,
        canvasInfo: null,
        config: capture.config
    };

    console.log('🚀 Iniciando captura de Windy.com con Playwright');
    console.log(`⏰ Timestamp: ${capture.timestamp}`);
    console.log(`� Coordenadas: Lat ${RADAR_LAT}, Lon ${RADAR_LON}, Zoom ${RADAR_ZOOM}`);
    console.log(`�📁 Destino: ${capture.filepath}`);
    console.log('='.repeat(60));

    try {
        await capture.setupBrowser();
        await capture.navigateToWindy();
        result.canvasInfo = await capture.waitForWindyToLoad();
        await capture.optimizeForScreenshot();

        result.filepath = await capture.takeScreenshot();
        result.pageInfo = await capture.getPageInfo();

        const isValid = await capture.validateScreenshot();
        result.success = isValid;
        result.validationPassed = isValid;

        console.log('='.repeat(60));
        console.log('🎉 CAPTURA COMPLETADA EXITOSAMENTE');
        console.log(`📸 Archivo: ${capture.filename}`);
        console.log(`✅ Validación: ${isValid ? 'EXITOSA' : 'CON ADVERTENCIAS'}`);

        return result;
    } catch (error) {
        console.error('❌ ERROR EN LA CAPTURA:');
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        
        error.capturePath = capture.filepath;
        error.captureTimestamp = capture.timestamp;
        error.captureConfig = capture.config;
        throw error;
    } finally {
        await capture.cleanup();
    }
}

// Función principal para CLI
async function main() {
    try {
        const result = await runPlaywrightCapture();
        process.exit(result.success ? 0 : 1);
    } catch (error) {
        console.error('❌ ERROR FATAL:');
        console.error(error.message);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    process.on('SIGINT', () => {
        console.log('\n⚠️ Proceso interrumpido por usuario');
        process.exit(1);
    });

    process.on('SIGTERM', () => {
        console.log('\n⚠️ Proceso terminado por sistema');
        process.exit(1);
    });

    main();
}

module.exports = { WindyPlaywrightCapture, CONFIG, runPlaywrightCapture };
