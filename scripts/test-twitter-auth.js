#!/usr/bin/env node

/**
 * Script para diagnosticar problemas de autenticación con Twitter API
 */

const { TwitterApi } = require('twitter-api-v2');

// Leer credenciales desde variables de entorno
const credentials = {
    appKey: process.env.TWITTER_API_KEY || 'tFTg3gSAjQjBAfk1woi2myLm3',
    appSecret: process.env.TWITTER_API_SECRET || 'r82dhQXUxhnOq9CbBbQ4IfRJ1D5RwoPbBx0MDf0SNjtV7J02BK',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '1975621527157559296-ADarfQDDD9PZGBQp7j6okEFUmJSmhM',
    accessSecret: process.env.TWITTER_ACCESS_SECRET || 'zyj0KGxvsE8vJmeBbBQER7yrz3D8wbnbdh1c643h8S86Z',
};

console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN TWITTER API');
console.log('='.repeat(60));

// Verificar que tenemos todas las credenciales
console.log('\n📋 Verificación de credenciales:');
console.log(`   ✓ API Key: ${credentials.appKey.substring(0, 10)}... (${credentials.appKey.length} chars)`);
console.log(`   ✓ API Secret: ${credentials.appSecret.substring(0, 10)}... (${credentials.appSecret.length} chars)`);
console.log(`   ✓ Access Token: ${credentials.accessToken.substring(0, 15)}... (${credentials.accessToken.length} chars)`);
console.log(`   ✓ Access Secret: ${credentials.accessSecret.substring(0, 10)}... (${credentials.accessSecret.length} chars)`);

async function testAuthentication() {
    try {
        console.log('\n🔐 Probando autenticación OAuth 1.0a User Context...');
        
        const client = new TwitterApi({
            appKey: credentials.appKey,
            appSecret: credentials.appSecret,
            accessToken: credentials.accessToken,
            accessSecret: credentials.accessSecret,
        });

        // Test 1: Verificar credenciales con v2.me()
        console.log('\n📝 Test 1: Verificando con v2.me()...');
        try {
            const me = await client.v2.me();
            console.log('   ✅ v2.me() exitoso');
            console.log(`   👤 Usuario: @${me.data.username}`);
            console.log(`   🆔 ID: ${me.data.id}`);
            console.log(`   📛 Nombre: ${me.data.name}`);
        } catch (error) {
            console.log('   ❌ v2.me() falló');
            console.log(`   Error: ${error.code || error.statusCode} - ${error.message}`);
            if (error.data) {
                console.log(`   Detalles: ${JSON.stringify(error.data, null, 2)}`);
            }
        }

        // Test 2: Verificar con v1.1 (API antigua)
        console.log('\n📝 Test 2: Verificando con v1.verifyCredentials()...');
        try {
            const v1User = await client.v1.verifyCredentials();
            console.log('   ✅ v1.verifyCredentials() exitoso');
            console.log(`   👤 Usuario: @${v1User.screen_name}`);
            console.log(`   🆔 ID: ${v1User.id_str}`);
        } catch (error) {
            console.log('   ❌ v1.verifyCredentials() falló');
            console.log(`   Error: ${error.code || error.statusCode} - ${error.message}`);
            if (error.data) {
                console.log(`   Detalles: ${JSON.stringify(error.data, null, 2)}`);
            }
        }

        // Test 3: Probar upload de media
        console.log('\n📝 Test 3: Verificando permisos de media upload...');
        try {
            // Crear un pequeño buffer de imagen de prueba (1x1 pixel PNG)
            const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            const mediaId = await client.v1.uploadMedia(testImage, { mimeType: 'image/png' });
            console.log('   ✅ Media upload exitoso');
            console.log(`   🖼️ Media ID: ${mediaId}`);
            
            // Eliminar el media de prueba
            try {
                await client.v1.deleteMedia(mediaId);
                console.log('   🗑️ Media de prueba eliminado');
            } catch (e) {
                console.log('   ⚠️ No se pudo eliminar media de prueba (normal)');
            }
        } catch (error) {
            console.log('   ❌ Media upload falló');
            console.log(`   Error: ${error.code || error.statusCode} - ${error.message}`);
            if (error.data) {
                console.log(`   Detalles: ${JSON.stringify(error.data, null, 2)}`);
            }
        }

    } catch (error) {
        console.error('\n💥 Error fatal:');
        console.error(error);
    }
}

testAuthentication().then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado');
}).catch((error) => {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Diagnóstico falló con error:', error);
    process.exit(1);
});
