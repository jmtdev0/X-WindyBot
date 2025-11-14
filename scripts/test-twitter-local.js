#!/usr/bin/env node

/**
 * Script de PRUEBA LOCAL para publicar en Twitter
 * Lee credenciales desde secrets.txt y publica una captura de prueba
 */

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class TwitterTestLocal {
    constructor() {
        this.credentials = null;
        this.client = null;
        this._pendingAltText = null;
    }

    /**
     * Ejecuta la tarea de captura local (npm run capture) y espera a que termine
     * Solo para uso local/ pruebas
     */
    async runCapture() {
        console.log('\n🚧 Generando nueva captura con `npm run capture` (local)...');

        return new Promise((resolve, reject) => {
            const cmd = process.platform === 'win32' ? 'npm' : 'npm';
            const args = ['run', 'capture'];

            const child = spawn(cmd, args, { shell: true, stdio: 'inherit' });

            child.on('error', (err) => {
                console.error('❌ Error iniciando proceso de captura:', err.message);
                reject(err);
            });

            child.on('exit', (code) => {
                if (code === 0) {
                    console.log('✅ Captura generada correctamente');
                    resolve();
                } else {
                    const err = new Error(`El proceso de captura finalizó con código ${code}`);
                    console.error('❌', err.message);
                    reject(err);
                }
            });
        });
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
        
        // Formatear fecha y hora en español con timezone de Madrid
        const dateStr = now.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Madrid'
        });
        
        const timeStr = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Madrid'
        });
        
        // Coordenadas (usar las del env o las por defecto)
        const lat = process.env.RADAR_LAT || '39.061';
        const lon = process.env.RADAR_LON || '-4.478';
        const zoom = process.env.RADAR_ZOOM || '5';
        
        // Construir URL de Windy
        const windyUrl = `https://www.windy.com/?radar,${lat},${lon},${zoom}`;
        
        // Mensaje optimizado para no exceder 280 caracteres
        let message = `En Windy, puedes ver en directo por dónde avanzan las lluvias. Accede pulsando en este enlace y haz zoom en el lugar en el que vives: ${windyUrl}\n\n`;
        message += `Captura: ${dateStr} ${timeStr}\n\n`;
        message += `#DANA #Lluvias #Tormentas #Meteorología`;
        
        return message;
    }

    /**
     * Genera un texto alternativo (alt text) para la imagen
     * El texto invita al lector a abrir Windy para ver el avance de las lluvias en tiempo real
     */
    generateAltText(filename) {
        // Texto conciso y accesible
        const alt = `Mapa de radar (${filename}) que muestra la situación de precipitaciones. Abre Windy (https://www.windy.com/?radar) para ver en tiempo real cómo avanzan las lluvias y hacer zoom en tu localidad.`;
        return alt;
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

            // Intentar añadir alt text si el cliente lo soporta y se ha generado uno
            try {
                if (this._pendingAltText) {
                    const altText = this._pendingAltText;
                    // createMediaMetadata es el método para añadir metadata en v1
                    await this.client.v1.createMediaMetadata(mediaId, { alt_text: { text: altText } });
                    console.log('✅ Alt text añadido a la imagen');
                }
            } catch (metaErr) {
                console.warn('⚠️ No se pudo añadir alt text:', metaErr?.message || metaErr);
            }

            // Limpiar alt text pendiente
            this._pendingAltText = null;

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
     * Comprueba si se puede responder al tweet indicado
     * Devuelve { ok: true } o { ok: false, reason: '...', details }
     */
    async canReplyToTweet(tweetId) {
        if (!this.client) {
            throw new Error('Cliente no inicializado. Llama a initialize() primero');
        }

        try {
            const res = await this.client.v2.singleTweet(tweetId, {
                'tweet.fields': 'reply_settings,author_id',
                expansions: 'author_id',
                'user.fields': 'protected,username'
            });

            if (!res || !res.data) {
                return { ok: false, reason: 'not_found' };
            }

            const replySettings = res.data.reply_settings || 'everyone';
            const author = res.includes?.users?.[0];

            if (author && author.protected) {
                return { ok: false, reason: 'author_protected', details: { author } };
            }

            if (replySettings !== 'everyone') {
                return { ok: false, reason: 'reply_settings', details: { replySettings } };
            }

            return { ok: true };
        } catch (err) {
            // Propagar información útil
            const details = err?.data || err?.message || err;
            return { ok: false, reason: 'api_error', details };
        }
    }

    /**
     * Publica un tweet en respuesta a otro tweet (solo para uso local)
     * @param {string|number} replyToId - ID del tweet al que responder
     * @param {boolean} post - Si true, realiza la subida y publicación; si false, dry-run
     */
    async replyToTweet(replyToId, options = {}) {
        const { post = false, customText = null } = options;
        console.log(`\n🔁 Preparando tweet en respuesta a ID: ${replyToId}`);

        // Si estamos en modo post, omitir pre-check para evitar rate limits
        // La API de Twitter validará al publicar
        if (post) {
            console.log('ℹ️  Omitiendo pre-check (modo publicación directa)');
        } else {
            // En modo dry-run, verificar que podemos responder a ese tweet
            const check = await this.canReplyToTweet(replyToId);
            if (!check.ok) {
                console.error('\n❌ Imposible responder al tweet objetivo:', check.reason);
                if (check.details) console.error('   Detalles:', JSON.stringify(check.details, null, 2));
                return { success: false, error: `Cannot reply: ${check.reason}`, details: check.details };
            }
        }

        let imagePath = null;
        let message = customText || '';
        let altText = null;

        if (customText) {
            message = customText.trim();
            if (!message) {
                throw new Error('El texto personalizado para la respuesta está vacío');
            }
        } else {
            // Generar una captura nueva en local (npm run capture)
            await this.runCapture();

            // Encontrar la última captura y generar el mensaje + alt text
            imagePath = await this.findLatestCapture();
            const imageName = path.basename(imagePath);
            message = this.generateMessage(imageName);
            altText = this.generateAltText(imageName);
            this._pendingAltText = altText;
        }

        console.log('\n📝 Mensaje (respuesta):');
        console.log('─'.repeat(60));
        console.log(message);
        console.log('─'.repeat(60));

        if (!post) {
            console.log('\nℹ️ Modo dry-run: no se subirá ni publicará el tweet. Usa --post para publicar.');
            return { dryRun: true, message, imagePath, altText, customText: Boolean(customText) };
        }

        console.log('\n⚠️  Se publicará un tweet REAL en respuesta. Presiona Ctrl+C en los próximos 5 segundos para cancelar...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        try {
            if (customText) {
                const tweet = await this.client.v2.tweet({
                    text: message,
                    reply: { in_reply_to_tweet_id: String(replyToId) }
                });

                console.log('✅ Reply de texto publicado correctamente');
                console.log(`   Tweet ID: ${tweet.data.id}`);
                console.log(`   URL: https://twitter.com/i/web/status/${tweet.data.id}`);

                return tweet.data;
            }

            // Subir la imagen y publicar el tweet como respuesta
            const mediaId = await this.uploadMedia(imagePath);

            const tweet = await this.client.v2.tweet({
                text: message,
                media: { media_ids: [mediaId] },
                reply: { in_reply_to_tweet_id: String(replyToId) }
            });

            console.log('✅ Reply publicado correctamente');
            console.log(`   Tweet ID: ${tweet.data.id}`);
            console.log(`   URL: https://twitter.com/i/web/status/${tweet.data.id}`);

            return tweet.data;
        } catch (error) {
            console.error('❌ Error publicando reply:', error.message);
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
            
            // 3. Generar una captura nueva y encontrarla
            await this.runCapture();
            const imagePath = await this.findLatestCapture();
            const imageName = path.basename(imagePath);
            
            // 4. Generar mensaje y alt text
            const message = this.generateMessage(imageName);
            const altText = this.generateAltText(imageName);
            this._pendingAltText = altText;
            console.log('\n📝 Mensaje del tweet:');
            console.log('─'.repeat(60));
            console.log(message);
            console.log('─'.repeat(60));
            console.log('Alt text:', altText);
            
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
    
    // Manejo simple de argumentos CLI: --reply-to <ID> [--post]
    const argv = require('minimist')(process.argv.slice(2), {
        string: ['reply-to', 'r', 'text', 'message']
    });
    const rawCustomText = typeof argv.text === 'string' ? argv.text : (typeof argv.message === 'string' ? argv.message : null);
    const customText = rawCustomText ? rawCustomText.trim() : null;

    (async () => {
        const tester = new TwitterTestLocal();

        // Soporte para generate-only sin reply-to
            const genOnly = argv['generate-only'] || argv.gen || false;

            if (genOnly && !(argv['reply-to'] || argv.r)) {
                try {
                    await tester.runCapture();
                    const imagePath = await tester.findLatestCapture();
                    const imageName = path.basename(imagePath);
                    const message = customText || tester.generateMessage(imageName);
                    const altText = tester.generateAltText(imageName);

                    console.log('\n--- TWEET CONTENT ---');
                    console.log(message);
                    console.log('--- IMAGE PATH ---');
                    console.log(imagePath);
                    console.log('--- ALT TEXT ---');
                    console.log(altText);
                    console.log('\n--- SUMMARY (JSON) ---');
                    console.log(JSON.stringify({ tweet: message, imagePath, altText, canReply: null }, null, 2));

                    process.exit(0);
                } catch (err) {
                    console.error('❌ Error generando contenido:', err.message || err);
                    process.exit(1);
                }
            }

            // Soporte para reply-to
            if (argv['reply-to'] || argv.r) {
                const replyIdRaw = argv['reply-to'] || argv.r;
                const replyId = replyIdRaw ? String(replyIdRaw).trim() : null;
                const doPost = argv.post || false;
                if (!replyId) {
                    console.error('❌ Debes proporcionar un ID válido con --reply-to');
                    process.exit(1);
                }

            try {
                await tester.loadCredentials();
                await tester.initialize();

                if (genOnly) {
                    // Generate capture + message but do not upload/post
                    const check = await tester.canReplyToTweet(replyId);
                    if (!check.ok) {
                        console.error('\n⚠️ Pre-check: no se puede responder a ese tuit:', check.reason);
                        if (check.details) console.error('   Detalles:', JSON.stringify(check.details, null, 2));
                    }

                    if (customText) {
                        const message = customText;
                        console.log('\n--- TWEET CONTENT (CUSTOM) ---');
                        console.log(message);
                        console.log('\n--- SUMMARY (JSON) ---');
                        console.log(JSON.stringify({ tweet: message, imagePath: null, altText: null, canReply: check, customText: true }, null, 2));

                        process.exit(0);
                    }

                    // Generate capture and message
                    await tester.runCapture();
                    const imagePath = await tester.findLatestCapture();
                    const imageName = path.basename(imagePath);
                    const message = tester.generateMessage(imageName);
                    const altText = tester.generateAltText(imageName);

                    // Output in plain text and JSON summary
                    console.log('\n--- TWEET CONTENT ---');
                    console.log(message);
                    console.log('--- IMAGE PATH ---');
                    console.log(imagePath);
                    console.log('--- ALT TEXT ---');
                    console.log(altText);
                    console.log('\n--- SUMMARY (JSON) ---');
                    console.log(JSON.stringify({ tweet: message, imagePath, altText, canReply: check, customText: false }, null, 2));

                    process.exit(0);
                }

                const res = await tester.replyToTweet(replyId, { post: Boolean(doPost), customText });
                if (res && res.id) {
                    console.log(`\n✅ Reply publicado: https://twitter.com/i/web/status/${res.id}`);
                    process.exit(0);
                }
                process.exit(0);
            } catch (err) {
                console.error('❌ Error al ejecutar reply-to:', err.message);
                process.exit(1);
            }
        }

        // Si no hay reply-to, ejecutar el flujo normal
        const result = await main();
        process.exit(result.success ? 0 : 1);
    })();
}

module.exports = { TwitterTestLocal };
