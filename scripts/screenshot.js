const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Script para capturar screenshots del radar meteorológico de Windy.com
 * Utiliza Puppeteer para automatizar la navegación y captura
 */

const CONFIG = {
  // URL específica del radar de Windy (puedes personalizar esta URL)
  WINDY_URL: 'https://www.windy.com/?rain,2023-10-01-12,40.416,-3.703,8',
  
  // Configuraciones de captura
  VIEWPORT: {
    width: 1920,
    height: 1080
  },
  
  // Tiempo de espera para que cargue completamente la página
  WAIT_TIME: 5000,
  
  // Directorio donde guardar las capturas
  CAPTURES_DIR: path.join(__dirname, '..', 'captures'),
  
  // Selectores CSS para ocultar elementos innecesarios (opcional)
  ELEMENTS_TO_HIDE: [
    '#bottom',
    '.leaflet-control-container',
    '#menu-hamburger',
    '.size-button-container'
  ]
};

/**
 * Genera el nombre del archivo con timestamp
 * @returns {string} Nombre del archivo con formato: radar_YYYY-MM-DD_HH-MM-SS.png
 */
function generateFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `radar_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.png`;
}

/**
 * Función principal para capturar el screenshot
 */
async function captureRadarScreenshot() {
  console.log('🚀 Iniciando captura del radar meteorológico...');
  
  let browser;
  
  try {
    // Verificar que existe el directorio de capturas
    await fs.mkdir(CONFIG.CAPTURES_DIR, { recursive: true });
    
    // Configurar Puppeteer
    console.log('📱 Iniciando navegador...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport(CONFIG.VIEWPORT);
    
    // Configurar user agent para evitar detección de bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('🌐 Navegando a Windy.com...');
    
    // Navegar a la página
    await page.goto(CONFIG.WINDY_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('⏳ Esperando a que la página cargue completamente...');
    
    // Esperar a que cargue el mapa
    await page.waitForSelector('#windy-map', { timeout: 20000 });
    
    // Esperar tiempo adicional para animaciones y datos
    await page.waitForTimeout(CONFIG.WAIT_TIME);
    
    // Ocultar elementos innecesarios (opcional)
    for (const selector of CONFIG.ELEMENTS_TO_HIDE) {
      try {
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.style.display = 'none';
          }
        }, selector);
      } catch (error) {
        // Ignorar si el elemento no existe
        console.log(`ℹ️  Elemento no encontrado: ${selector}`);
      }
    }
    
    console.log('📸 Capturando screenshot...');
    
    // Generar nombre del archivo
    const fileName = generateFileName();
    const filePath = path.join(CONFIG.CAPTURES_DIR, fileName);
    
    // Capturar screenshot
    await page.screenshot({
      path: filePath,
      fullPage: false,
      quality: 90,
      type: 'png'
    });
    
    console.log(`✅ Screenshot guardado exitosamente: ${fileName}`);
    console.log(`📍 Ubicación: ${filePath}`);
    
    // Verificar que el archivo se creó correctamente
    const stats = await fs.stat(filePath);
    console.log(`📊 Tamaño del archivo: ${Math.round(stats.size / 1024)} KB`);
    
    return {
      success: true,
      fileName,
      filePath,
      fileSize: stats.size
    };
    
  } catch (error) {
    console.error('❌ Error durante la captura:', error.message);
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Navegador cerrado');
    }
  }
}

/**
 * Función para limpiar capturas antiguas (opcional)
 * Mantiene solo los últimos N archivos para evitar que el repo crezca demasiado
 */
async function cleanOldCaptures(keepLast = 100) {
  try {
    const files = await fs.readdir(CONFIG.CAPTURES_DIR);
    const radarFiles = files
      .filter(file => file.startsWith('radar_') && file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: path.join(CONFIG.CAPTURES_DIR, file)
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Ordenar por fecha descendente
    
    if (radarFiles.length > keepLast) {
      const filesToDelete = radarFiles.slice(keepLast);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`🗑️  Archivo antiguo eliminado: ${file.name}`);
      }
      
      console.log(`🧹 Limpieza completada. Eliminados ${filesToDelete.length} archivos antiguos`);
    }
    
  } catch (error) {
    console.error('⚠️  Error durante la limpieza:', error.message);
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  (async () => {
    const result = await captureRadarScreenshot();
    
    if (result.success) {
      console.log('🎉 ¡Captura completada exitosamente!');
      
      // Opcional: limpiar archivos antiguos
      // await cleanOldCaptures(50);
      
      process.exit(0);
    } else {
      console.error('💥 La captura falló');
      process.exit(1);
    }
  })();
}

module.exports = {
  captureRadarScreenshot,
  cleanOldCaptures,
  generateFileName,
  CONFIG
};