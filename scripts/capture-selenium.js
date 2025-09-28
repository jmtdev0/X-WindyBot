#!/usr/bin/env node

/**
 * Script de captura inteligente para Windy.com usando Selenium WebDriver
 * Optimizado para sitios JavaScript pesados con esperas inteligentes
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { existsSync } = require('fs');
const fs = require('fs').promises;
const path = require('path');

// Configuración
const CONFIG = {
    url: 'https://www.windy.com/?radar,39.853,-3.807,7',
    capturesDir: './captures',
    timeout: 45000, // 45 segundos timeout total
    waitForRadar: 15000, // 15 segundos específicos para el radar
    windowSize: { width: 1920, height: 1080 }
};

class WindyCapture {
    constructor() {
        this.driver = null;
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        this.filename = `radar_${this.timestamp}.png`;
        this.filepath = path.join(CONFIG.capturesDir, this.filename);
    }

    async setupDriver() {
        console.log('🚀 Configurando Chrome con Selenium WebDriver...');
        
        const chromeOptions = new chrome.Options();
        
        // Determinar la ruta correcta de Chromedriver instalada en el runner
        const candidateDriverPaths = [
            process.env.CHROMEDRIVER_PATH,
            '/usr/local/bin/chromedriver',
            (() => {
                try {
                    const chromedriver = require('chromedriver');
                    if (chromedriver && chromedriver.path) {
                        return chromedriver.path;
                    }
                } catch (err) {
                    // Ignorar si el paquete no expone la ruta o no existe
                }
                return null;
            })()
        ].filter(Boolean);

        let driverPathApplied = false;
        for (const candidate of candidateDriverPaths) {
            if (existsSync(candidate)) {
                chrome.setDefaultService(new chrome.ServiceBuilder(candidate).build());
                process.env.WEBDRIVER_CHROME_DRIVER = candidate;
                console.log(`🛠️ Chromedriver seleccionado: ${candidate}`);
                driverPathApplied = true;
                break;
            }
        }

        if (!driverPathApplied) {
            console.warn('⚠️ No se encontró un Chromedriver específico, Selenium intentará resolverlo automáticamente.');
        }

        // Opciones optimizadas para GitHub Actions
        chromeOptions
            .addArguments('--headless=new')
            .addArguments('--no-sandbox')
            .addArguments('--disable-dev-shm-usage')
            .addArguments('--disable-gpu')
            .addArguments('--disable-extensions')
            .addArguments('--disable-plugins')
            .addArguments('--disable-background-timer-throttling')
            .addArguments('--disable-backgrounding-occluded-windows')
            .addArguments('--disable-renderer-backgrounding')
            .addArguments('--disable-features=TranslateUI,VizDisplayCompositor')
            .addArguments('--no-first-run')
            .addArguments('--no-default-browser-check')
            .addArguments('--disable-logging')
            .addArguments('--disable-breakpad')
            .addArguments(`--window-size=${CONFIG.windowSize.width},${CONFIG.windowSize.height}`)
            .addArguments('--disable-web-security')
            .addArguments('--aggressive-cache-discard');

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .build();

        // Configurar timeouts
        await this.driver.manage().setTimeouts({
            implicit: 10000,
            pageLoad: CONFIG.timeout,
            script: CONFIG.timeout
        });

        console.log('✅ Driver configurado correctamente');
    }

    async navigateToWindy() {
        console.log('🌐 Navegando a Windy.com...');
        console.log(`📍 URL: ${CONFIG.url}`);
        
        await this.driver.get(CONFIG.url);
        console.log('✅ Página cargada');
    }

    async waitForWindyToLoad() {
        console.log('⏳ Esperando que Windy.com cargue completamente...');
        
        try {
            // Esperar a que aparezca el elemento principal del mapa
            const mapContainer = await this.driver.wait(
                until.elementLocated(By.css('#map, .leaflet-container, #windy-map, [class*="map"]')),
                20000
            );
            console.log('🗺️ Contenedor del mapa detectado');

            // Esperar a que se carguen las capas del radar
            console.log('📡 Esperando carga del radar meteorológico...');
            await this.driver.sleep(CONFIG.waitForRadar);

            // Intentar detectar si hay elementos de carga activos
            try {
                await this.driver.wait(async () => {
                    const loadingElements = await this.driver.findElements(
                        By.css('.loading, [class*="loading"], [class*="spinner"], .loader')
                    );
                    return loadingElements.length === 0;
                }, 10000);
                console.log('✅ Elementos de carga completados');
            } catch (err) {
                console.log('⚠️ No se detectaron indicadores de carga específicos');
            }

            // Scroll para activar lazy loading si existe
            await this.driver.executeScript('window.scrollTo(0, 100); window.scrollTo(0, 0);');
            
            // Espera adicional para asegurar renderizado completo
            await this.driver.sleep(3000);
            
            console.log('✅ Windy.com completamente cargado y listo para captura');
            
        } catch (error) {
            console.log('⚠️ Timeout esperando elementos específicos, continuando con captura...');
            console.log(`Error: ${error.message}`);
        }
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
        await fs.mkdir(CONFIG.capturesDir, { recursive: true });
        
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

// Función principal
async function main() {
    const capture = new WindyCapture();
    
    try {
        console.log('🚀 Iniciando captura inteligente de Windy.com con Selenium');
        console.log(`⏰ Timestamp: ${capture.timestamp}`);
        console.log(`📁 Destino: ${capture.filepath}`);
        console.log('=' .repeat(60));
        
        await capture.setupDriver();
        await capture.navigateToWindy();
        await capture.waitForWindyToLoad();
        await capture.optimizeForScreenshot();
        
        const screenshotPath = await capture.takeScreenshot();
        await capture.getPageInfo();
        
        const isValid = await capture.validateScreenshot();
        
        console.log('=' .repeat(60));
        console.log('🎉 CAPTURA COMPLETADA EXITOSAMENTE');
        console.log(`📸 Archivo: ${capture.filename}`);
        console.log(`✅ Validación: ${isValid ? 'EXITOSA' : 'CON ADVERTENCIAS'}`);
        
        // Salir con código apropiado
        process.exit(isValid ? 0 : 1);
        
    } catch (error) {
        console.error('❌ ERROR EN LA CAPTURA:');
        console.error(error.message);
        console.error(error.stack);
        
        process.exit(1);
        
    } finally {
        await capture.cleanup();
    }
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
    console.log('\n⚠️ Proceso interrumpido por usuario');
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️ Proceso terminado por sistema');
    process.exit(1);
});

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = { WindyCapture, CONFIG };