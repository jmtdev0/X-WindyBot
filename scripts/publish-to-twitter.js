#!/usr/bin/env node

/**
 * Script para publicar capturas del radar en Twitter/X
 * Usa la API v2 de Twitter con autenticación OAuth 2.0
 */

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');

// Configuración desde variables de entorno
const CONFIG = {
    // Credenciales de Twitter API (OAuth 2.0 User Context)
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
    
    // Coordenadas del radar (para el mensaje)
    radarLat: process.env.RADAR_LAT || '39.418',
    radarLon: process.env.RADAR_LON || '-5.160',
    radarZoom: process.env.RADAR_ZOOM || '6',
    
    // Configuración del mensaje
    includeLink: process.env.TWITTER_INCLUDE_LINK !== 'false', // true por defecto
    customMessage: process.env.TWITTER_CUSTOM_MESSAGE || null
};

class TwitterPublisher {
    constructor() {
        this.client = null;
        this.validateCredentials();
    }

    validateCredentials() {
        const required = [
            'TWITTER_API_KEY',
            'TWITTER_API_SECRET', 
            'TWITTER_ACCESS_TOKEN',
            'TWITTER_ACCESS_SECRET'
        ];

        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(
                `❌ Faltan credenciales de Twitter API:\n` +
                `   ${missing.join(', ')}\n` +
                `   Por favor, configura los secrets en GitHub.\n` +
                `   Ver: TWITTER_SETUP.md`
            );
        }

        console.log('✅ Credenciales de Twitter validadas');
    }

    async initialize() {
        console.log('🐦 Inicializando cliente de Twitter API...');
        
        try {
            this.client = new TwitterApi({
                appKey: CONFIG.appKey,
                appSecret: CONFIG.appSecret,
                accessToken: CONFIG.accessToken,
                accessSecret: CONFIG.accessSecret,
            });

            // Verificar credenciales
            const me = await this.client.v2.me();
            console.log(`✅ Autenticado como: @${me.data.username}`);
            
            return me.data;
        } catch (error) {
            console.error('❌ Error al inicializar cliente de Twitter:');
            console.error(error.message);
            throw error;
        }
    }

    generateMessage(filename) {
        // Si hay un mensaje personalizado, usarlo
        if (CONFIG.customMessage) {
            return CONFIG.customMessage;
        }

        // Extraer timestamp del nombre del archivo
        const timestamp = filename.replace('radar_', '').replace('.png', '');
        const date = new Date();
        
        // Formatear fecha y hora en español con timezone de Madrid (Europe/Madrid)
        const dateStr = date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            timeZone: 'Europe/Madrid'
        });
        const timeStr = date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Madrid'
        });

        // Construir URL de Windy
        const windyUrl = `https://www.windy.com/?radar,${CONFIG.radarLat},${CONFIG.radarLon},${CONFIG.radarZoom}`;

        // Mensaje con nuevo formato
        let message = `En Windy.com, puedes ver en directo por dónde avanzan las lluvias.\n`;
        message += `🔗 Accede pulsando en este enlace: ${windyUrl}\n\n`;
        message += `(Esta captura ha sido tomada el ${dateStr} a las ${timeStr})\n\n`;
        message += `#DANA #Lluvias #Tormentas #RadarMeteorológico #WeatherRadar #Meteorología #Clima`;

        return message;
    }

    async uploadMedia(imagePath) {
        console.log(`📤 Subiendo imagen a Twitter: ${path.basename(imagePath)}`);
        
        try {
            // Leer el archivo
            const imageBuffer = await fs.readFile(imagePath);
            
            // Subir la imagen usando la API v1.1 (necesaria para media)
            const mediaId = await this.client.v1.uploadMedia(imageBuffer, {
                mimeType: 'image/png',
            });
            
            console.log(`✅ Imagen subida correctamente (Media ID: ${mediaId})`);
            return mediaId;
        } catch (error) {
            console.error('❌ Error al subir imagen:');
            console.error(error.message);
            throw error;
        }
    }

    async publishTweet(message, mediaId) {
        console.log('📝 Publicando tweet...');
        
        try {
            const tweet = await this.client.v2.tweet({
                text: message,
                media: { media_ids: [mediaId] }
            });
            
            const tweetId = tweet.data.id;
            const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
            
            console.log('✅ Tweet publicado exitosamente');
            console.log(`🔗 URL: ${tweetUrl}`);
            
            return {
                id: tweetId,
                url: tweetUrl,
                text: tweet.data.text
            };
        } catch (error) {
            console.error('❌ Error al publicar tweet:');
            console.error(error.message);
            throw error;
        }
    }
}

async function findLatestCapture(capturesDir = './captures') {
    console.log(`🔍 Buscando última captura en: ${capturesDir}`);
    
    try {
        const files = await fs.readdir(capturesDir);
        const pngFiles = files.filter(f => f.startsWith('radar_') && f.endsWith('.png'));
        
        if (pngFiles.length === 0) {
            throw new Error('No se encontraron capturas en la carpeta captures/');
        }

        // Ordenar por nombre (que incluye timestamp) y tomar el más reciente
        pngFiles.sort().reverse();
        const latestFile = pngFiles[0];
        const fullPath = path.join(capturesDir, latestFile);
        
        // Verificar que el archivo existe y tiene contenido
        const stats = await fs.stat(fullPath);
        const sizeKB = Math.round(stats.size / 1024);
        
        console.log(`✅ Captura encontrada: ${latestFile} (${sizeKB} KB)`);
        
        if (stats.size < 10000) {
            throw new Error(`Archivo muy pequeño (${sizeKB} KB), posible error en la captura`);
        }
        
        return {
            filename: latestFile,
            path: fullPath,
            size: stats.size,
            sizeKB
        };
    } catch (error) {
        console.error('❌ Error al buscar captura:');
        console.error(error.message);
        throw error;
    }
}

async function publishLatestCapture() {
    console.log('🚀 Iniciando publicación en Twitter');
    console.log('='.repeat(60));
    
    const result = {
        success: false,
        capture: null,
        tweet: null,
        error: null
    };

    try {
        // 1. Encontrar la última captura
        result.capture = await findLatestCapture();
        
        // 2. Inicializar cliente de Twitter
        const publisher = new TwitterPublisher();
        const userInfo = await publisher.initialize();
        
        // 3. Generar mensaje
        const message = publisher.generateMessage(result.capture.filename);
        console.log('\n📝 Mensaje del tweet:');
        console.log('─'.repeat(60));
        console.log(message);
        console.log('─'.repeat(60));
        console.log('');
        
        // 4. Subir imagen
        const mediaId = await publisher.uploadMedia(result.capture.path);
        
        // 5. Publicar tweet
        result.tweet = await publisher.publishTweet(message, mediaId);
        result.success = true;
        
        console.log('='.repeat(60));
        console.log('🎉 PUBLICACIÓN COMPLETADA EXITOSAMENTE');
        console.log(`📸 Imagen: ${result.capture.filename}`);
        console.log(`🐦 Tweet ID: ${result.tweet.id}`);
        console.log(`🔗 URL: ${result.tweet.url}`);
        console.log(`👤 Usuario: @${userInfo.username}`);
        
        return result;
        
    } catch (error) {
        console.error('='.repeat(60));
        console.error('❌ ERROR EN LA PUBLICACIÓN:');
        console.error(error.message);
        
        result.error = error.message;
        result.success = false;
        
        throw error;
    }
}

// Función principal para CLI
async function main() {
    try {
        const result = await publishLatestCapture();
        process.exit(result.success ? 0 : 1);
    } catch (error) {
        console.error('\n❌ ERROR FATAL:');
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

module.exports = { TwitterPublisher, publishLatestCapture, findLatestCapture };
