#!/usr/bin/env node

/**
 * Script de prueba rápida para validar Selenium WebDriver
 * Útil para debugging y verificar la configuración
 */

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testSeleniumSetup() {
    console.log('🧪 Probando configuración de Selenium...');
    
    let driver = null;
    
    try {
        console.log('🚀 Configurando Chrome headless...');
        
        const chromeOptions = new chrome.Options();
        chromeOptions
            .addArguments('--headless=new')
            .addArguments('--no-sandbox')
            .addArguments('--disable-dev-shm-usage')
            .addArguments('--disable-gpu');

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .build();

        console.log('✅ Driver creado exitosamente');

        console.log('🌐 Navegando a página de prueba...');
        await driver.get('https://httpbin.org/html');
        
        const title = await driver.getTitle();
        console.log(`📄 Título de página: ${title}`);
        
        console.log('📸 Tomando captura de prueba...');
        const screenshot = await driver.takeScreenshot();
        
        const fs = require('fs').promises;
        await fs.mkdir('./captures', { recursive: true });
        await fs.writeFile('./captures/test-selenium.png', screenshot, 'base64');
        
        console.log('✅ Captura de prueba guardada: ./captures/test-selenium.png');
        
        console.log('🎉 SELENIUM FUNCIONA CORRECTAMENTE');
        
    } catch (error) {
        console.error('❌ ERROR EN SELENIUM:');
        console.error(error.message);
        process.exit(1);
        
    } finally {
        if (driver) {
            await driver.quit();
            console.log('🧹 Driver cerrado');
        }
    }
}

if (require.main === module) {
    testSeleniumSetup();
}

module.exports = { testSeleniumSetup };