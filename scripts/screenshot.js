const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

/**
 * Script para capturar screenshots del radar meteorológico de Windy.com
 * Utiliza wkhtmltopdf (más rápido y ligero que Puppeteer)
 */

const execAsync = util.promisify(exec);

const CONFIG = {
  // URL específica del radar de Windy (puedes personalizar esta URL)
  WINDY_URL: 'https://www.windy.com/-Weather-radar-radar?radar,39.853,-3.807,7',
  
  // Configuraciones de captura
  VIEWPORT: {
    width: 1920,
    height: 1080
  },
  
  // Tiempo de espera para que cargue completamente la página (aumentado para Windy)
  WAIT_TIME: 8000,
  
  // Directorio donde guardar las capturas
  CAPTURES_DIR: path.join(__dirname, '..', 'captures'),
  
  // Opciones optimizadas para wkhtmltopdf con contenido pesado de JavaScript
  WKHTML_OPTIONS: [
    '--width', '1920',
    '--height', '1080', 
    '--format', 'png',
    '--quality', '90',
    '--javascript-delay', '8000',  // Más tiempo para JS
    '--no-stop-slow-scripts',
    '--enable-javascript',
    '--load-error-handling', 'ignore',
    '--load-media-error-handling', 'ignore'
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
 * Función principal para capturar el screenshot usando wkhtmltopdf
 */
async function captureRadarScreenshot() {
  console.log('🚀 Iniciando captura del radar meteorológico...');
  
  try {
    // Verificar que existe el directorio de capturas
    await fs.mkdir(CONFIG.CAPTURES_DIR, { recursive: true });
    
    // Verificar que wkhtmltopdf está disponible
    console.log('� Verificando wkhtmltopdf...');
    try {
      await execAsync('wkhtmltoimage --version');
      console.log('✅ wkhtmltoimage encontrado');
    } catch (error) {
      throw new Error('wkhtmltoimage no está instalado. Instala con: sudo apt-get install wkhtmltopdf');
    }
    
    console.log('🌐 Capturando desde Windy.com...');
    
    // Generar nombre del archivo
    const fileName = generateFileName();
    const filePath = path.join(CONFIG.CAPTURES_DIR, fileName);
    
    // Construir comando wkhtmltoimage con configuración simplificada
    const wkhtmlCommand = [
      'wkhtmltoimage',
      ...CONFIG.WKHTML_OPTIONS,
      `"${CONFIG.WINDY_URL}"`,
      `"${filePath}"`
    ].join(' ');
    
    console.log('📸 Ejecutando captura con configuración optimizada...');
    console.log(`🔧 Comando: ${wkhtmlCommand}`);
    
    // Configurar variables de entorno para mejor renderizado
    const env = {
      ...process.env,
      QT_QPA_PLATFORM: 'offscreen',
      DISPLAY: process.env.DISPLAY || ':99'
    };
    
    // Ejecutar captura con timeout extendido
    const { stdout, stderr } = await execAsync(wkhtmlCommand, { 
      timeout: 60000,  // 60 segundos timeout
      env: env
    });
    
    if (stderr && !stderr.includes('Warning')) {
      console.log(`⚠️  Advertencia: ${stderr}`);
    }
    
    // Verificar que el archivo se creó correctamente
    const stats = await fs.stat(filePath);
    
    if (stats.size === 0) {
      throw new Error('El archivo de captura está vacío');
    }
    
    console.log(`✅ Screenshot guardado exitosamente: ${fileName}`);
    console.log(`📍 Ubicación: ${filePath}`);
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
  }
}

/**
 * Función para limpiar capturas antiguas (automática)
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
      
      // Limpiar archivos antiguos automáticamente (mantener últimas 100 capturas)
      await cleanOldCaptures(100);
      
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