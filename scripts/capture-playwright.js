#!/usr/bin/env node

/**
 * Script de captura para Windy.com usando Playwright
 * Playwright tiene mejor soporte para WebGL en modo headless que Selenium
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Leer coordenadas desde variables de entorno o usar valores por defecto
const RADAR_LAT = process.env.RADAR_LAT || '39.259';
const RADAR_LON = process.env.RADAR_LON || '-4.684';
const RADAR_ZOOM = process.env.RADAR_ZOOM || '5';
// Modo headed para ver navegador y usar GPU real (mejores colores)
const HEADED_MODE = process.env.HEADED === 'true' || process.env.HEADED === '1';

// Configuración
const CONFIG = {
    // Añadir parámetro labelsOn para activar nombres de ciudades y lugares
    url: `https://www.windy.com/?radar,${RADAR_LAT},${RADAR_LON},${RADAR_ZOOM},i:pressure,m:eUQadgT`,
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
        const headless = !HEADED_MODE;
        console.log(`🚀 Iniciando Playwright con Chromium (headless: ${headless})...`);
        if (HEADED_MODE) {
            console.log('👁️  Modo HEADED activado - se abrirá ventana del navegador con GPU real');
        }
        
        this.browser = await chromium.launch({
            headless: headless,
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

        // Intentar forzar el canvas al tamaño del viewport
        console.log('📐 Intentando redimensionar canvas al tamaño del viewport...');
        await this.page.evaluate(({ viewportWidth, viewportHeight }) => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                console.log(`Canvas actual: ${canvas.width}x${canvas.height}`);
                // Forzar redimensión del canvas
                canvas.width = viewportWidth;
                canvas.height = viewportHeight;
                canvas.style.width = viewportWidth + 'px';
                canvas.style.height = viewportHeight + 'px';
                console.log(`Canvas redimensionado a: ${canvas.width}x${canvas.height}`);
                
                // Disparar evento de redimensión para que Windy recalcule
                window.dispatchEvent(new Event('resize'));
            }
        }, { viewportWidth: this.config.viewport.width, viewportHeight: this.config.viewport.height });
        
        // Esperar a que Windy procese el resize
        await this.page.waitForTimeout(3000);

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

        // Método 1: Screenshot del viewport completo con UI oculto (mejor calidad)
        try {
            console.log('   📸 Screenshot del viewport completo...');
            
            // Ocultar elementos de UI temporalmente de forma más agresiva
            await this.page.evaluate(() => {
                // Ocultar controles y elementos de Windy
                const uiSelectors = [
                    '#mobile-ovr-select', '#bottom', '#logo-wrapper', 
                    '.leaflet-control-container', '.size-mobile',
                    '.plugin-lhpane', '.plugin-rhpane', '#windy-app-menu',
                    '#detail', '.menu-icon', '.close-icon',
                    '.bottom-border', '.copyright'
                ];
                
                window._hiddenElements = [];
                document.querySelectorAll('*').forEach(el => {
                    // Ocultar todo excepto el mapa y canvas
                    if (el.tagName === 'CANVAS' || el.id === 'map-container' || el.classList.contains('leaflet-container')) {
                        return; // No ocultar estos
                    }
                    
                    // Ocultar elementos con ciertos IDs o clases
                    uiSelectors.forEach(selector => {
                        if (el.matches && el.matches(selector)) {
                            if (el.style.display !== 'none') {
                                window._hiddenElements.push({ el, display: el.style.display });
                                el.style.display = 'none';
                            }
                        }
                    });
                });
            });

            // Esperar un momento para que se apliquen los cambios
            await this.page.waitForTimeout(500);

            // Captura con clip explícito del viewport completo
            await this.page.screenshot({
                path: this.filepath,
                fullPage: false,
                type: 'png',
                animations: 'disabled',
                clip: {
                    x: 0,
                    y: 0,
                    width: this.config.viewport.width,
                    height: this.config.viewport.height
                }
            });
            
            // Restaurar elementos ocultos
            await this.page.evaluate(() => {
                if (window._hiddenElements) {
                    window._hiddenElements.forEach(({ el, display }) => {
                        el.style.display = display;
                    });
                }
            });
            
            const stats = await fs.stat(this.filepath);
            console.log(`   ✅ Captura viewport: ${Math.round(stats.size/1024)} KB`);
            
            // Si la captura es razonablemente grande, es válida
            if (stats.size > 100000) {
                console.log(`✅ Captura guardada vía viewport screenshot (${this.config.viewport.width}x${this.config.viewport.height}): ${this.filename}`);
                return this.filepath;
            } else {
                console.log(`   ⚠️ Screenshot pequeño (${Math.round(stats.size/1024)} KB), probando método alternativo...`);
            }
        } catch (err) {
            console.log(`   ⚠️ Falló screenshot de viewport: ${err.message}`);
        }

        // Método 2: Screenshot de página sin clip (fallback)
        try {
            console.log('   Método 2: Screenshot de página sin clip...');
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
                console.log(`⚠️ Screenshot muy pequeño, intentando método alternativo...`);
            }
        } catch (err) {
            console.log(`⚠️ Falló screenshot de página: ${err.message}`);
        }

        // Método 3: Captura directa del canvas (último fallback)
        try {
            console.log('   Método 3: Captura directa del canvas con toDataURL()...');
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
                    console.log(`⚠️ Captura muy pequeña`);
                }
            } else {
                console.log(`⚠️ Canvas dataURL vacío o muy pequeño`);
            }
        } catch (err) {
            console.log(`⚠️ Falló captura directa del canvas: ${err.message}`);
        }

        // Si llegamos aquí, algo salió mal
        throw new Error('Todos los métodos de captura fallaron');
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

    async normalizeColorProfile() {
        console.log('🎨 Creando composición con estilo profesional...');
        
        try {
            const tempPath = this.filepath + '.temp.png';
            
            // Leer la imagen capturada
            const image = sharp(this.filepath);
            const metadata = await image.metadata();
            
            // Dimensiones y configuración
            const padding = 25; // Margen alrededor (reducido de 50px a 25px)
            const borderRadius = 16; // Radio de esquinas redondeadas
            const shadowBlur = 24; // Difuminado de sombra
            const shadowOffset = 8; // Desplazamiento de sombra
            
            const finalWidth = metadata.width + (padding * 2);
            const finalHeight = metadata.height + (padding * 2);
            
            // Procesar imagen del radar con saturación mejorada
            console.log('   🎨 Aplicando mejoras de color (saturación 1.9x)...');
            const processedRadar = await sharp(this.filepath)
                .modulate({
                    brightness: 1.05,    // Ligeramente más brillante
                    saturation: 1.9,     // Saturación aumentada
                    hue: 0
                })
                .gamma(2.2)
                .toColorspace('srgb')
                .png()
                .toBuffer();
            
            // Crear máscara de bordes redondeados (SVG)
            const roundedCornersMask = Buffer.from(`
                <svg width="${metadata.width}" height="${metadata.height}">
                    <rect x="0" y="0" width="${metadata.width}" height="${metadata.height}" 
                          rx="${borderRadius}" ry="${borderRadius}" fill="white"/>
                </svg>
            `);
            
            // Aplicar máscara de bordes redondeados
            console.log('   ✂️ Aplicando bordes redondeados...');
            const radarWithRoundedCorners = await sharp(processedRadar)
                .composite([{
                    input: roundedCornersMask,
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();
            
            // Crear sombra difuminada (SVG)
            const shadowSvg = Buffer.from(`
                <svg width="${finalWidth}" height="${finalHeight}">
                    <defs>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur/2}"/>
                            <feOffset dx="0" dy="${shadowOffset}" result="offsetblur"/>
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.3"/>
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <rect x="${padding}" y="${padding}" 
                          width="${metadata.width}" height="${metadata.height}" 
                          rx="${borderRadius}" ry="${borderRadius}" 
                          fill="black" opacity="0.15" 
                          filter="url(#shadow)"/>
                </svg>
            `);
            
            // Crear canvas blanco de fondo con sombra
            console.log('   🎨 Componiendo imagen final con sombra...');
            await sharp({
                create: {
                    width: finalWidth,
                    height: finalHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            })
                .composite([
                    // Primero la sombra
                    {
                        input: shadowSvg,
                        top: 0,
                        left: 0,
                        blend: 'over'
                    },
                    // Luego la imagen del radar con bordes redondeados
                    {
                        input: radarWithRoundedCorners,
                        top: padding,
                        left: padding,
                        blend: 'over'
                    }
                ])
                .png({
                    compressionLevel: 6,
                    adaptiveFiltering: true
                })
                .toFile(tempPath);
            
            // Reemplazar archivo original
            await fs.unlink(this.filepath);
            await fs.rename(tempPath, this.filepath);
            
            const stats = await fs.stat(this.filepath);
            console.log(`✅ Composición profesional creada (${Math.round(stats.size/1024)} KB)`);
            console.log(`   📐 Tamaño: ${finalWidth}x${finalHeight}px`);
            console.log(`   🎨 Efectos: bordes redondeados + sombra + saturación 1.9x`);
            
            return true;
        } catch (error) {
            console.log(`⚠️ No se pudo crear composición: ${error.message}`);
            console.error(error.stack);
            // No es crítico, continuar con la imagen original
            return false;
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
        
        // Normalizar perfil de color para consistencia en todos los dispositivos
        await capture.normalizeColorProfile();
        
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
