const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { runPlaywrightCapture, CONFIG: DEFAULT_CAPTURE_CONFIG } = require('../scripts/capture-playwright');

const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
const DEFAULT_CAPTURES_DIR = path.resolve(__dirname, '..', 'captures');
const RESOLVED_CAPTURES_DIR = path.resolve(process.env.LOCAL_CAPTURES_DIR || DEFAULT_CAPTURES_DIR);

const captureOverrides = (() => {
  const overrides = { capturesDir: RESOLVED_CAPTURES_DIR };

  if (process.env.WINDY_URL) {
    overrides.url = process.env.WINDY_URL;
  }

  const parsePositiveInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const timeoutMs = parsePositiveInt(process.env.WINDY_TIMEOUT_MS);
  if (timeoutMs) {
    overrides.timeout = timeoutMs;
  }

  const radarWaitMs = parsePositiveInt(process.env.WINDY_WAIT_MS || process.env.WAIT_FOR_RADAR_MS);
  if (radarWaitMs) {
    overrides.waitForRadar = radarWaitMs;
  }

  const width = parsePositiveInt(process.env.WINDOW_WIDTH || process.env.CAPTURE_WIDTH);
  const height = parsePositiveInt(process.env.WINDOW_HEIGHT || process.env.CAPTURE_HEIGHT);
  if (width || height) {
    overrides.windowSize = {
      width: width || DEFAULT_CAPTURE_CONFIG.windowSize.width,
      height: height || DEFAULT_CAPTURE_CONFIG.windowSize.height
    };
  }

  return overrides;
})();

let isCapturing = false;
let lastResult = null;

const app = express();
app.use(express.json());
app.use('/captures', express.static(RESOLVED_CAPTURES_DIR));

app.get('/', (_req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>X-WindyBot Local</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 2rem; background: #f4f6fb; color: #1a1a1a; }
main { max-width: 720px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12); }
h1 { margin-top: 0; font-size: 2rem; }
button { background: #2563eb; color: #fff; border: none; border-radius: 999px; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s ease-in-out, transform 0.1s ease-in-out; display: inline-flex; align-items: center; gap: 0.5rem; }
button:hover { background: #1d4ed8; }
button:disabled { background: #94a3b8; cursor: not-allowed; }
#output { margin-top: 1.5rem; background: #0f172a; color: #cffafe; padding: 1rem; border-radius: 12px; font-family: 'Fira Code', 'Consolas', monospace; max-height: 280px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
#preview { margin-top: 1.5rem; display: flex; justify-content: center; }
#preview img { max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25); }
.status-badge { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
.status-ok { background: #dcfce7; color: #166534; }
.status-warning { background: #fef3c7; color: #92400e; }
.status-error { background: #fee2e2; color: #b91c1c; }
.small { color: #475569; font-size: 0.9rem; }
</style>
</head>
<body>
<main>
  <h1>🎯 X-WindyBot · Captura Local</h1>
  <p class="small">Levanta este servidor en <code>localhost:${PORT}</code> y dispara capturas con Selenium de forma manual. Las capturas se guardan en la carpeta <code>captures/</code>.</p>
  <button id="capture-btn">📸 Tomar captura ahora</button>
  <section id="status" class="small" style="margin-top:1rem;"></section>
  <pre id="output">Pulsa "Tomar captura" para empezar…</pre>
  <div id="preview"></div>
</main>
<script>
const btn = document.getElementById('capture-btn');
const output = document.getElementById('output');
const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');

async function refreshStatus() {
  try {
    const res = await fetch('/status');
    const data = await res.json();
    const { isCapturing, lastResult } = data;
    const badgeClass = lastResult ? 'status-badge status-' + lastResult.status : 'status-badge';
    const badgeText = lastResult ? lastResult.status.toUpperCase() : 'sin ejecución previa';
    const details = lastResult
      ? 'Última ejecución: ' + new Date(lastResult.completedAt).toLocaleString() + ' · Archivo: ' + (lastResult.fileName || 'n/a')
      : '';
    statusEl.innerHTML =
      '<span class="' + badgeClass + '">' + badgeText + '</span> ' +
      (isCapturing ? '· Captura en progreso…' : '') +
      '<br>' + details;
  } catch (err) {
    statusEl.textContent = 'No se pudo obtener el estado actual.';
  }
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  output.textContent = '⏳ Ejecutando captura con Selenium…';
  preview.innerHTML = '';

  try {
    const response = await fetch('/capture', { method: 'POST' });
    const data = await response.json();
    const pretty = JSON.stringify(data, null, 2);
    output.textContent = pretty;

    if (data.fileUrl) {
      const img = new Image();
      img.src = data.fileUrl + '?t=' + Date.now();
      img.alt = 'Captura más reciente';
      preview.innerHTML = '';
      preview.appendChild(img);
    }
  } catch (error) {
    output.textContent = '❌ Error solicitando captura: ' + error.message;
  } finally {
    btn.disabled = false;
    refreshStatus();
  }
});

refreshStatus();
</script>
</body>
</html>`);
});

app.get('/status', (_req, res) => {
    res.json({
        isCapturing,
        lastResult
    });
});

app.post('/capture', async (_req, res) => {
    if (isCapturing) {
        return res.status(429).json({
            status: 'busy',
            message: 'Ya existe una captura en ejecución, espera a que termine.'
        });
    }

    isCapturing = true;
    try {
  await fs.mkdir(RESOLVED_CAPTURES_DIR, { recursive: true });
  const captureResult = await runPlaywrightCapture({ ...captureOverrides });

        const status = captureResult.success ? 'ok' : 'warning';
        const payload = {
            status,
            message: captureResult.success ? 'Captura completada correctamente.' : 'Captura generada pero con advertencias durante la validación.',
            timestamp: captureResult.timestamp,
            filePath: captureResult.filepath,
            fileName: captureResult.filename,
            fileUrl: `/captures/${path.basename(captureResult.filepath)}`,
      pageInfo: captureResult.pageInfo,
      configUsed: captureResult.config
        };

        lastResult = { ...payload, completedAt: new Date().toISOString() };
        res.status(captureResult.success ? 200 : 202).json(payload);
    } catch (error) {
        console.error('Error durante la captura local:', error);
        const payload = {
            status: 'error',
            message: error.message || 'Error inesperado durante la captura.',
            timestamp: new Date().toISOString(),
            filePath: error.capturePath ? error.capturePath : null,
      fileName: error.capturePath ? path.basename(error.capturePath) : null,
      configUsed: error.captureConfig || captureOverrides
        };
        lastResult = { ...payload, completedAt: new Date().toISOString() };
        res.status(500).json(payload);
    } finally {
        isCapturing = false;
    }
});

async function start() {
  await fs.mkdir(RESOLVED_CAPTURES_DIR, { recursive: true });
    app.listen(PORT, () => {
        console.log(`🌬️  X-WindyBot local server escuchando en http://localhost:${PORT}`);
    console.log(`🗂️  Las capturas se guardarán en: ${RESOLVED_CAPTURES_DIR}`);
    if (captureOverrides !== undefined) {
      console.log('⚙️  Config overrides activos:', captureOverrides);
    }
    });
}

start().catch((err) => {
    console.error('No se pudo iniciar el servidor local de X-WindyBot:', err);
    process.exit(1);
});
