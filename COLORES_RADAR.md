# 🎨 Problema de Colores del Radar en Capturas

## 🔍 Diagnóstico

Las capturas muestran los círculos de radar en **gris oscuro** en lugar de colores vivos (azul, verde, amarillo, rojo) debido a las limitaciones del renderizado WebGL en modo headless.

### Causa raíz:
- **Chromium en modo headless** usa **SwiftShader** (renderizador de software)
- SwiftShader **no ejecuta correctamente los shaders de color** de Windy
- Los shaders WebGL que calculan los colores del radar fallan silenciosamente
- Resultado: colores en escala de grises en lugar de colores RGB vivos

## ✅ Soluciones Implementadas

### **Para GitHub Actions (Linux + Xvfb)**

Actualizar `.github/workflows/capture-ultra-fast.yml` para usar `xvfb-run`:

```yaml
- name: Capturar radar con Playwright
  run: |
    xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" npm run capture
```

Xvfb (X Virtual Framebuffer) crea un display virtual con mejor soporte OpenGL que SwiftShader.

### **Para Testing Local (Windows)**

#### Opción 1: Modo Headed (recomendado para desarrollo)
```powershell
$env:HEADED="true" ; npm run capture
```

Esto abre una ventana del navegador visible que usa la GPU real de tu PC.

#### Opción 2: Aceptar colores grises (actual)
Las capturas funcionan pero los colores no son vivos. Útil para testing rápido.

## 🔧 Cambios Pendientes

### 1. Actualizar Workflow de GitHub Actions

Archivo: `.github/workflows/capture-ultra-fast.yml`

```yaml
# ANTES (sin colores correctos)
- name: Capturar radar con Playwright
  run: npm run capture

# DESPUÉS (con colores correctos)
- name: Capturar radar con Playwright
  run: |
    xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" npm run capture
```

### 2. Añadir variable de entorno HEADED al script

Ya implementado en `capture-playwright.js`:
- `HEADED=true` → Modo con ventana visible (GPU real)
- `HEADED=false` o no definido → Modo headless (SwiftShader, colores grises)

## 📊 Comparación de Métodos

| Método | Colores | Velocidad | Uso |
|--------|---------|-----------|-----|
| **Headless + SwiftShader** | ❌ Grises | ⚡ Rápido | CI actual |
| **Headless + Xvfb** | ✅ Correctos | ⚡ Rápido | CI recomendado |
| **Headed (ventana visible)** | ✅ Correctos | 🐢 Más lento | Local development |

## 🚀 Próximos Pasos

1. ✅ Script funcional (captura 27-50 KB)
2. ⏳ **Actualizar workflow para usar `xvfb-run`**
3. ⏳ Probar en GitHub Actions
4. ⏳ Verificar colores correctos en producción

## 🧪 Testing

### Local (Windows) - Con colores correctos:
```powershell
$env:HEADED="true"
npm run capture
```

### Local (Windows) - Sin colores (rápido):
```powershell
npm run capture
```

### GitHub Actions - Con colores correctos:
Usar `xvfb-run` en el workflow (ver arriba).

## 📖 Referencias

- [Playwright Headless Limitations](https://playwright.dev/docs/ci#running-headed)
- [Xvfb for WebGL](https://www.x.org/releases/X11R7.6/doc/man/man1/Xvfb.1.xhtml)
- [SwiftShader Limitations](https://github.com/google/swiftshader#limitations)
