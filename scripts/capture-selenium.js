#!/usr/bin/env node

/**
 * Script de captura inteligente para Windy.com usando Selenium WebDriver
 * Optimizado para sitios JavaScript pesados con esperas inteligentes
 */

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { existsSync } = require('fs');
const fs = require('fs').promises;
const path = require('path');

// Configuración
const CONFIG = {
    url: 'https://www.windy.com/?radar,39.853,-3.807,7',
    capturesDir: './captures',
    timeout: 45000,
    waitForRadar: 20000,
    windowSize: { width: 1920, height: 1080 }
};

class WindyCapture {
    constructor(customConfig = {}) {
        this.config = { ...CONFIG, ...customConfig };
        this.driver = null;
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        this.filename = `radar_${this.timestamp}.png`;
        this.filepath = path.join(this.config.capturesDir, this.filename);
    }

    async setupDriver() {
        console.log('🚀 Configurando Chrome con Selenium WebDriver (modo simplificado)...');

        const chromeOptions = new chrome.Options();

        chromeOptions
            // .addArguments('--headless=new')  // Temporalmente deshabilitado para diagnóstico
            .addArguments('--no-sandbox')
            .addArguments('--disable-dev-shm-usage')
            .addArguments('--disable-extensions')
            .addArguments('--disable-plugins')
            .addArguments('--disable-background-timer-throttling')
            .addArguments('--disable-backgrounding-occluded-windows')
            .addArguments('--disable-renderer-backgrounding')
            .addArguments('--no-first-run')
            .addArguments('--no-default-browser-check')
            .addArguments(`--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`)
            .addArguments('--disable-gpu-sandbox')
            .addArguments('--use-angle=swiftshader')
            .addArguments('--use-gl=angle')
            .addArguments('--enable-webgl')
            .addArguments('--enable-features=WebGL')
            .addArguments('--ignore-gpu-blocklist')
            .addArguments('--enable-logging=stderr')
            .addArguments('--v=1');

        const driverBuilder = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions);

        const customService = this.buildCustomChromeService();
        if (customService) {
            driverBuilder.setChromeService(customService.service);
            console.log(`🔗 Chromedriver personalizado aplicado (${customService.source})`);
        }

        this.driver = await driverBuilder.build();

        // Configurar timeouts
        await this.driver.manage().setTimeouts({
            implicit: 0,
            pageLoad: this.config.timeout,
            script: this.config.timeout
        });

        console.log('✅ Driver configurado correctamente (Selenium Manager manejará Chromedriver)');
    }

    buildCustomChromeService() {
        const candidates = [];

        if (process.env.CHROMEDRIVER_PATH) {
            candidates.push({
                path: process.env.CHROMEDRIVER_PATH,
                source: 'CHROMEDRIVER_PATH'
            });
        }

        try {
            const chromedriver = require('chromedriver');
            const driverPath = chromedriver && chromedriver.path;
            const driverVersion = (() => {
                try {
                    return require('chromedriver/package.json').version;
                } catch (err) {
                    return 'unknown';
                }
            })();

            if (driverPath) {
                candidates.push({
                    path: driverPath,
                    source: `chromedriver npm package v${driverVersion}`
                });
            }
        } catch (err) {
            // Ignorar si el paquete no está disponible
        }

        for (const candidate of candidates) {
            if (candidate.path && existsSync(candidate.path)) {
                process.env.WEBDRIVER_CHROME_DRIVER = candidate.path;
                return {
                    service: new chrome.ServiceBuilder(candidate.path),
                    source: candidate.source
                };
            }
        }

        console.log('ℹ️  Usando Selenium Manager para resolver Chromedriver automáticamente');
        return null;
    }

    async navigateToWindy() {
        console.log('🌐 Navegando a Windy.com...');
        console.log(`📍 URL: ${this.config.url}`);

        await this.driver.get(this.config.url);
        console.log('✅ Página cargada');
    }

    async waitForWindyToLoad() {
        console.log(`⏳ Esperando ${this.config.waitForRadar / 1000}s para estabilizar Windy.com...`);
        await this.driver.sleep(this.config.waitForRadar);
        
        // Verificar que el canvas del mapa esté presente
        try {
            const canvasCheck = await this.driver.executeScript(`
                const canvas = document.querySelector('canvas');
                if (!canvas) return { found: false, error: 'No canvas element' };
                
                const ctx = canvas.getContext('2d');
                if (!ctx) return { found: false, error: 'No context' };
                
                // Verificar que el canvas no esté vacío
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hasContent = imageData.data.some((pixel, i) => i % 4 === 3 && pixel > 0);
                
                return { 
                    found: true, 
                    hasContent,
                    width: canvas.width,
                    height: canvas.height
                };
            `);
            
            console.log('🗺️ Estado del canvas:', JSON.stringify(canvasCheck));
        } catch (err) {
            console.log('⚠️ No se pudo verificar el canvas:', err.message);
        }
        
        console.log('✅ Tiempo de espera completado');
    }

    async optimizeForScreenshot() {
        console.log('🎨 Optimizando interfaz para captura...');
        
        try {
            // Intentar ocultar elementos de UI que puedan interferir
            await this.driver.executeScript(`
                // Ocultar overlays, popups, cookies, etc.
                const elementsToHide = [
                    '.cookie', '.popup', '.modal', '.advertisement', 
                    '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
                    '[class*="banner"]', '[class*="overlay"]'
                ];
                
                elementsToHide.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => el.style.display = 'none');
                });
                
                // Forzar renderizado completo
                document.body.style.transform = 'translateZ(0)';
                
                console.log('UI optimizada para captura');
                return true;
            `);
            
            console.log('✅ Interfaz optimizada');
        } catch (error) {
            console.log('⚠️ No se pudo optimizar la interfaz:', error.message);
        }
    }

    async takeScreenshot() {
        console.log('📸 Tomando captura de pantalla...');
        
        // Asegurar que el directorio existe
        await fs.mkdir(this.config.capturesDir, { recursive: true });
        
        // Tomar la captura
        const screenshot = await this.driver.takeScreenshot();
        await fs.writeFile(this.filepath, screenshot, 'base64');
        
        console.log(`✅ Captura guardada: ${this.filename}`);
        return this.filepath;
    }

    async getPageInfo() {
        try {
            const title = await this.driver.getTitle();
            const url = await this.driver.getCurrentUrl();
            
            console.log(`📄 Título de página: ${title}`);
            console.log(`🔗 URL actual: ${url}`);
            
            return { title, url };
        } catch (error) {
            console.log('⚠️ No se pudo obtener información de la página');
            return null;
        }
    }

    async cleanup() {
        if (this.driver) {
            console.log('🧹 Cerrando navegador...');
            await this.driver.quit();
        }
    }

    async validateScreenshot() {
        try {
            const stats = await fs.stat(this.filepath);
            const sizeKB = Math.round(stats.size / 1024);
            
            console.log(`📊 Tamaño del archivo: ${sizeKB} KB`);
            
            if (stats.size < 10000) { // Menos de 10KB probablemente sea un error
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

async function runSeleniumCapture(customConfig = {}) {
    const capture = new WindyCapture(customConfig);
    const result = {
        success: false,
        validationPassed: false,
        filepath: capture.filepath,
        filename: capture.filename,
        timestamp: capture.timestamp,
        pageInfo: null,
        config: capture.config
    };

    console.log('🚀 Iniciando captura inteligente de Windy.com con Selenium');
    console.log(`⏰ Timestamp: ${capture.timestamp}`);
    console.log(`📁 Destino: ${capture.filepath}`);
    console.log('='.repeat(60));

    try {
        await capture.setupDriver();
        await capture.navigateToWindy();
        await capture.waitForWindyToLoad();
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
        const result = await runSeleniumCapture();
        process.exit(result.success ? 0 : 1);
    } catch (error) {
        console.error('❌ ERROR EN LA CAPTURA:');
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
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

module.exports = { WindyCapture, CONFIG, runSeleniumCapture };