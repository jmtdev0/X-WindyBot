# 📍 Configuración de Coordenadas del Radar

Este documento explica cómo configurar las coordenadas del radar meteorológico para capturar diferentes ubicaciones.

## 🌍 Coordenadas Predefinidas de España

| Ciudad | Latitud | Longitud | Zoom | Enlace Windy |
|--------|---------|----------|------|--------------|
| **Madrid** | 40.416 | -3.703 | 7 | [Ver mapa](https://www.windy.com/?radar,40.416,-3.703,7) |
| **Barcelona** | 41.385 | 2.173 | 7 | [Ver mapa](https://www.windy.com/?radar,41.385,2.173,7) |
| **Valencia** | 39.470 | -0.377 | 7 | [Ver mapa](https://www.windy.com/?radar,39.470,-0.377,7) |
| **Sevilla** | 37.389 | -5.984 | 7 | [Ver mapa](https://www.windy.com/?radar,37.389,-5.984,7) |
| **Bilbao** | 43.263 | -2.935 | 7 | [Ver mapa](https://www.windy.com/?radar,43.263,-2.935,7) |
| **Málaga** | 36.721 | -4.421 | 7 | [Ver mapa](https://www.windy.com/?radar,36.721,-4.421,7) |
| **Zaragoza** | 41.656 | -0.877 | 7 | [Ver mapa](https://www.windy.com/?radar,41.656,-0.877,7) |
| **Murcia** | 37.992 | -1.131 | 7 | [Ver mapa](https://www.windy.com/?radar,37.992,-1.131,7) |
| **Las Palmas** | 28.124 | -15.436 | 7 | [Ver mapa](https://www.windy.com/?radar,28.124,-15.436,7) |
| **Extremadura** | 39.418 | -5.160 | 6 | [Ver mapa](https://www.windy.com/?radar,39.418,-5.160,6) |

## ⚙️ Configurar Variables en GitHub

### Paso 1: Acceder a la configuración del repositorio

1. Ve a tu repositorio en GitHub: `https://github.com/jmtdev0/X-WindyBot`
2. Haz clic en **Settings** (⚙️ Configuración)

### Paso 2: Crear las variables

1. En el menú lateral, ve a **Secrets and variables** → **Actions**
2. Selecciona la pestaña **Variables** (no Secrets)
3. Haz clic en **New repository variable**

### Paso 3: Añadir cada variable

Crea las siguientes 3 variables una por una:

#### Variable 1: RADAR_LAT
- **Name**: `RADAR_LAT`
- **Value**: `39.418` (o la latitud que desees)
- Clic en **Add variable**

#### Variable 2: RADAR_LON
- **Name**: `RADAR_LON`
- **Value**: `-5.160` (o la longitud que desees)
- Clic en **Add variable**

#### Variable 3: RADAR_ZOOM
- **Name**: `RADAR_ZOOM`
- **Value**: `6` (o el zoom que desees, entre 4 y 10)
- Clic en **Add variable**

### Paso 4: Verificar las variables

Deberías ver algo como esto en la sección Variables:

```
RADAR_LAT    39.418    Updated now
RADAR_LON    -5.160    Updated now
RADAR_ZOOM   6         Updated now
```

## 🔍 Encontrar Coordenadas Personalizadas

### Método 1: Desde Windy.com

1. Ve a [Windy.com](https://www.windy.com)
2. Navega al área que quieres capturar
3. Ajusta el zoom al nivel deseado
4. Mira la URL del navegador:
   ```
   https://www.windy.com/?radar,LAT,LON,ZOOM
   ```
5. Copia los valores de LAT, LON y ZOOM

### Método 2: Google Maps

1. Ve a [Google Maps](https://maps.google.com)
2. Haz clic derecho en el punto que quieres
3. Selecciona "¿Qué hay aquí?"
4. Copia las coordenadas que aparecen (formato: `40.416775, -3.703790`)
5. Usa el primer número como LAT y el segundo como LON

## 🧪 Probar Localmente

Antes de configurar en GitHub, puedes probar las coordenadas localmente:

### Windows PowerShell
```powershell
$env:RADAR_LAT="40.416"
$env:RADAR_LON="-3.703"
$env:RADAR_ZOOM="7"
npm run capture
```

### Linux/Mac
```bash
RADAR_LAT=40.416 RADAR_LON=-3.703 RADAR_ZOOM=7 npm run capture
```

La captura se guardará en `captures/` y podrás verificar que muestra la ubicación correcta.

## 📊 Niveles de Zoom Recomendados

| Zoom | Cobertura | Uso Recomendado |
|------|-----------|-----------------|
| 4 | Muy amplia (país completo) | Vista general nacional |
| 5 | Amplia (regiones grandes) | Comunidades autónomas |
| 6 | **Estándar (recomendado)** | Provincia o región |
| 7 | Ciudad y alrededores | Áreas metropolitanas |
| 8 | Ciudad | Detalle urbano |
| 9-10 | Muy detallado | Áreas específicas |

## 🔄 Cambiar Coordenadas

Para cambiar las coordenadas después de haberlas configurado:

1. Ve a **Settings** → **Secrets and variables** → **Actions** → **Variables**
2. Haz clic en el **icono de lápiz** (✏️) junto a la variable
3. Cambia el valor
4. Guarda los cambios
5. Ejecuta el workflow manualmente para probar

## ❓ Preguntas Frecuentes

**¿Puedo usar coordenadas fuera de España?**
Sí, cualquier ubicación del mundo funciona. Simplemente usa las coordenadas correspondientes.

**¿Qué pasa si no configuro las variables?**
El sistema usará las coordenadas por defecto: `39.418, -5.160, 6` (Extremadura, España).

**¿Puedo tener múltiples ubicaciones?**
No directamente. Pero puedes cambiar las variables cuando quieras capturar diferentes ubicaciones.

**¿Las variables son privadas?**
Las Variables de Repositorio (no Secrets) son visibles para cualquiera que tenga acceso al repositorio. No uses este método para información sensible.

## 🆘 Solución de Problemas

**Las capturas no muestran la ubicación correcta:**
1. Verifica que los valores no tengan espacios extra
2. Asegúrate de usar el punto (`.`) como separador decimal, no coma (`,`)
3. La longitud en España debe ser negativa (ejemplo: `-5.160`)
4. Revisa los logs del workflow en Actions para ver qué coordenadas se están usando

**El workflow falla después de cambiar las coordenadas:**
1. Verifica que los valores sean números válidos
2. Comprueba que la latitud esté entre -90 y 90
3. Comprueba que la longitud esté entre -180 y 180
4. Comprueba que el zoom esté entre 1 y 15

---

💡 **Tip**: Después de cambiar las coordenadas, ejecuta el workflow manualmente desde **Actions** para verificar que la nueva ubicación se captura correctamente.
