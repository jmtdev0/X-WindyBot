#!/usr/bin/env node

/**
 * Comprueba si un tuit es accesible y si se puede responder
 * Uso: node scripts/check-tweet.js <tweetId>
 */

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');

async function loadCredentials() {
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  const content = await fs.readFile(secretsPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  return {
    appKey: lines[0].split(' ').pop().trim(),
    appSecret: lines[1].split(' ').pop().trim(),
    accessToken: lines[2].split(' ').pop().trim(),
    accessSecret: lines[3].split(' ').pop().trim()
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Uso: node scripts/check-tweet.js <tweetId>');
    process.exit(2);
  }

  const tweetId = argv[0];

  try {
    const creds = await loadCredentials();
    const client = new TwitterApi({
      appKey: creds.appKey,
      appSecret: creds.appSecret,
      accessToken: creds.accessToken,
      accessSecret: creds.accessSecret
    });

    console.log(`Comprobando tuit ${tweetId} con usuario autenticado...`);

    const res = await client.v2.singleTweet(tweetId, {
      'tweet.fields': 'reply_settings,possibly_sensitive,author_id,created_at',
      expansions: 'author_id',
      'user.fields': 'protected,username'
    });

    console.log('--- TWEET ---');
    console.log(JSON.stringify(res.data, null, 2));
    console.log('--- INCLUDES ---');
    console.log(JSON.stringify(res.includes, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('ERROR comprobando tuit:', err.message || err);
    if (err.data) console.error('Detalles API:', JSON.stringify(err.data, null, 2));

    // Intenta extraer headers (rate-limit / retry-after)
    const headers = (err.response && err.response.headers) || (err.request && err.request.res && err.request.res.headers) || err.headers || null;
    if (headers) {
      console.log('--- RESPONSE HEADERS ---');
      try {
        console.log(JSON.stringify(headers, null, 2));
      } catch (e) {
        console.log(headers);
      }
    }
    process.exit(1);
  }
}

main();
