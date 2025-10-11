#!/usr/bin/env node

/**
 * Script de DEBUG para Windy - modo NO headless para ver qué está pasando
 */

const { chromium } = require('playwright');

async function debugWindy() {
    console.log('🔍 Iniciando debug de Windy en modo VISIBLE...');
    
    const browser = await chromium.launch({
        headless: false, // VISIBLE para debug
        slowMo: 100, // Ralentizar para ver qué pasa
        args: [
            '--enable-gpu',
            '--use-gl=desktop'
        ]
    });
    
    const page = await browser.newPage({
        viewport: { width: 1920, height: 1080 }
    });
    
    const url = 'https://www.windy.com/?radar,39.418,-5.160,6';
    console.log(`📍 Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    console.log('⏳ Esperando 10 segundos para que cargue...');
    await page.waitForTimeout(10000);
    
    // Listar TODOS los canvas
    const allCanvases = await page.evaluate(() => {
        const canvases = Array.from(document.querySelectorAll('canvas'));
        return canvases.map((c, i) => ({
            index: i,
            width: c.width,
            height: c.height,
            id: c.id,
            className: c.className,
            parentClass: c.parentElement?.className || '',
            hasWebGL: !!(c.getContext('webgl2') || c.getContext('webgl'))
        }));
    });
    
    console.log('\n📊 TODOS LOS CANVAS ENCONTRADOS:');
    console.log(JSON.stringify(allCanvases, null, 2));
    
    console.log('\n⏳ Esperando 30 segundos más para ver el mapa...');
    console.log('👀 Observa la ventana del navegador');
    await page.waitForTimeout(30000);
    
    // Screenshot para comparar
    await page.screenshot({ path: './captures/debug-screenshot.png', fullPage: false });
    console.log('📸 Screenshot guardado en captures/debug-screenshot.png');
    
    console.log('\n✅ Debug completado. Presiona ENTER para cerrar...');
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });
    
    await browser.close();
}

debugWindy().catch(console.error);
