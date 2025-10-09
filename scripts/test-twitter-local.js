#!/usr/bin/env node

/**
 * Script de PRUEBA LOCAL para publicar en Twitter
 * Lee credenciales desde secrets.txt y publica una captura de prueba
 */

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');

class TwitterTestLocal {
    constructor() {
        this.credentials = null;
        this.client = null;
    }

    /**
     * Lee las credenciales desde secrets.txt
     */
    async loadCredentials() {
        console.log('🔑 Leyendo credenciales desde secrets.txt...');
        
        try {
            const secretsPath = path.join(__dirname, '..', 'secrets.txt');
            const content = await fs.readFile(secretsPath, 'utf-8');
            
            // Parsear el archivo
            const lines = content.split('\n').filter(line => line.trim());
            
            this.credentials = {
                apiKey: lines[0].split(' ').pop().trim(),
                apiSecret: lines[1].split(' ').pop().trim(),
                accessToken: lines[2].split(' ').pop().trim(),
                accessSecret: lines[3].split(' ').pop().trim()
            };
            
            console.log('✅ Credenciales cargadas correctamente');
            console.log(`   API Key: ${this.credentials.apiKey.substring(0, 10)}...`);
            console.log(`   Access Token: ${this.credentials.accessToken.substring(0, 10)}...`);
            
            return true;
        } catch (error) {
            console.error('❌ Error leyendo secrets.txt:', error.message);
            throw error;
        }
    }

    /**
     * Inicializa el cliente de Twitter
     */
    async initialize() {
        console.log('\n🐦 Inicializando cliente de Twitter API v2...');
        
        if (!this.credentials) {
            throw new Error('Credenciales no cargadas. Llama a loadCredentials() primero');
        }
        
        // Crear cliente de Twitter con OAuth 1.0a (User Context)
        this.client = new TwitterApi({
            appKey: this.credentials.apiKey,
            appSecret: this.credentials.apiSecret,
            accessToken: this.credentials.accessToken,
            accessSecret: this.credentials.accessSecret,
        });
        
        // Verificar credenciales
        try {
            const me = await this.client.v2.me();
            console.log('✅ Autenticación exitosa');
            console.log(`   Usuario: @${me.data.username}`);
            console.log(`   ID: ${me.data.id}`);
            console.log(`   Nombre: ${me.data.name}`);
            
            return me.data;
        } catch (error) {
            console.error('❌ Error de autenticación:', error.message);
            if (error.data) {
                console.error('   Detalles:', JSON.stringify(error.data, null, 2));
            }
            throw error;
        }
    }

    /**
     * Encuentra la última captura disponible
     */
    async findLatestCapture() {
        console.log('\n📂 Buscando capturas disponibles...');
        
        const capturesDir = path.join(__dirname, '..', 'captures');
        
        try {
            const files = await fs.readdir(capturesDir);
            const pngFiles = files.filter(f => f.endsWith('.png') && f.startsWith('radar_'));
            
            if (pngFiles.length === 0) {
                throw new Error('No se encontraron capturas en ./captures/');
            }
            
            // Ordenar por fecha (el nombre incluye timestamp)
            pngFiles.sort().reverse();
            
            const latestFile = pngFiles[0];
            const latestPath = path.join(capturesDir, latestFile);
            
            // Verificar tamaño
            const stats = await fs.stat(latestPath);
            const sizeKB = Math.round(stats.size / 1024);
            
            console.log(`✅ Capturas encontradas: ${pngFiles.length}`);
            console.log(`   Usando: ${latestFile}`);
            console.log(`   Tamaño: ${sizeKB} KB`);
            
            if (stats.size < 10000) {
                throw new Error(`Archivo muy pequeño (${stats.size} bytes), posible error`);
            }
            
            return latestPath;
            
        } catch (error) {
            console.error('❌ Error buscando capturas:', error.message);
            throw error;
        }
    }

    /**
     * Genera el mensaje del tweet
     */
    generateMessage(filename) {
        const now = new Date();
        
        // Formatear fecha en español
        const dateStr = now.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const timeStr = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Madrid'
        });
        
        // Coordenadas (usar las del env o las por defecto)
        const lat = process.env.RADAR_LAT || '39.418';
        const lon = process.env.RADAR_LON || '-5.160';
        
        // Construir URL de Windy
        const windyUrl = `https://www.windy.com/?radar,${lat},${lon},6`;
        
        // Mensaje
        const message = `🌦️ Radar meteorológico - PRUEBA LOCAL

📅 ${dateStr}
🕐 ${timeStr} (CET)
📍 Coordenadas: ${lat}, ${lon}

🔗 ${windyUrl}

#Meteorología #RadarMeteo #TiempoEspaña #WindyRadar`;
        
        return message;
    }

    /**
     * Sube la imagen a Twitter
     */
    async uploadMedia(imagePath) {
        console.log('\n📤 Subiendo imagen a Twitter...');
        console.log(`   Archivo: ${path.basename(imagePath)}`);
        
        try {
            const mediaId = await this.client.v1.uploadMedia(imagePath);
            
            console.log('✅ Imagen subida correctamente');
            console.log(`   Media ID: ${mediaId}`);
            
            return mediaId;
            
        } catch (error) {
            console.error('❌ Error subiendo imagen:', error.message);
            if (error.data) {
                console.error('   Detalles:', JSON.stringify(error.data, null, 2));
            }
            throw error;
        }
    }

    /**
     * Publica el tweet con la imagen
     */
    async publishTweet(message, mediaId) {
        console.log('\n🐦 Publicando tweet...');
        
        try {
            const tweet = await this.client.v2.tweet({
                text: message,
                media: {
                    media_ids: [mediaId]
                }
            });
            
            console.log('✅ Tweet publicado correctamente');
            console.log(`   Tweet ID: ${tweet.data.id}`);
            console.log(`   URL: https://twitter.com/i/web/status/${tweet.data.id}`);
            
            return tweet.data;
            
        } catch (error) {
            console.error('❌ Error publicando tweet:', error.message);
            if (error.data) {
                console.error('   Detalles:', JSON.stringify(error.data, null, 2));
            }
            throw error;
        }
    }

    /**
     * Ejecuta el flujo completo de prueba
     */
    async run() {
        console.log('🚀 SCRIPT DE PRUEBA LOCAL - PUBLICACIÓN EN TWITTER');
        console.log('='.repeat(60));
        
        try {
            // 1. Cargar credenciales
            await this.loadCredentials();
            
            // 2. Inicializar cliente de Twitter
            const userInfo = await this.initialize();
            
            // 3. Encontrar última captura
            const imagePath = await this.findLatestCapture();
            
            // 4. Generar mensaje
            const message = this.generateMessage(path.basename(imagePath));
            console.log('\n📝 Mensaje del tweet:');
            console.log('─'.repeat(60));
            console.log(message);
            console.log('─'.repeat(60));
            
            // 5. Confirmar con el usuario
            console.log('\n⚠️  ¿CONTINUAR CON LA PUBLICACIÓN?');
            console.log('   Se publicará un tweet REAL en Twitter');
            console.log('   Presiona Ctrl+C en los próximos 5 segundos para cancelar...');
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 6. Subir imagen
            const mediaId = await this.uploadMedia(imagePath);
            
            // 7. Publicar tweet
            const tweetData = await this.publishTweet(message, mediaId);
            
            console.log('\n' + '='.repeat(60));
            console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE');
            console.log('='.repeat(60));
            console.log(`✅ Tweet publicado en: https://twitter.com/${userInfo.username}/status/${tweetData.id}`);
            
            return {
                success: true,
                tweetId: tweetData.id,
                username: userInfo.username,
                url: `https://twitter.com/${userInfo.username}/status/${tweetData.id}`
            };
            
        } catch (error) {
            console.error('\n' + '='.repeat(60));
            console.error('❌ ERROR EN LA PRUEBA');
            console.error('='.repeat(60));
            console.error(error.message);
            
            if (error.stack) {
                console.error('\nStack trace:');
                console.error(error.stack);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Función principal
async function main() {
    const tester = new TwitterTestLocal();
    const result = await tester.run();
    
    process.exit(result.success ? 0 : 1);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    process.on('SIGINT', () => {
        console.log('\n\n⚠️  Prueba cancelada por el usuario');
        process.exit(1);
    });
    
    main();
}

module.exports = { TwitterTestLocal };
