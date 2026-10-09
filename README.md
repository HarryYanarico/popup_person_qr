# Escáner AR de Tarjetas (ar-qr-scanner)

App web de realidad aumentada: apunta con el móvil a una tarjeta impresa y verás una persona 3D anclada sobre ella, con mensajes emergentes en línea de tiempo.

Construida siguiendo el **PROMPT MAESTRO v2** (sprints en orden).

## Stack

- React 18 + TypeScript estricto + Vite
- TailwindCSS 4
- Zustand (estado en memoria; la persistencia es IndexedDB vía `idb`)
- React Router v6
- Three.js + @react-three/fiber + @react-three/drei (Sprint 1+)
- MindAR (tracking de imagen, Sprint 1+)
- Framer Motion (Sprint 3+)

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción (tsc + vite)
npm run lint     # oxlint
npm run smoke    # prueba de humo de /scan (requiere build previo)
```

> La cámara (`getUserMedia`) solo funciona en **HTTPS** o en `localhost`.

## Prueba de humo (Sprint 1+)

`npm run smoke` arranca `vite preview`, abre la app en Chrome headless con **cámara falsa**
(Chromium fake device) y comprueba: `idle` → clic → `scanning` (cámara + `.mind` cargados) → `Salir` → `idle`,
sin errores de consola. Guarda screenshots en `SMOKE_SHOT_DIR` si defines la variable.

## Cómo probar el escáner con la cámara real

1. `npm run dev` y abre `http://localhost:5173/scan` desde el móvil (misma red) o despliega en HTTPS.
2. Imprime `public/targets/card.png` (tarjeta de prueba de MindAR) o muestra esa imagen en otra pantalla.
3. Pulsa «Activar cámara» y apunta: debe aparecer un cubo índigo girando sobre la tarjeta.

## Notas técnicas de MindAR

- El target de prueba es `public/targets/card.mind` (ejemplo oficial de MindAR, MIT).
- Unidades de la escena: **1 unidad = ancho de la tarjeta** (convención de los ejemplos oficiales).
- `mind-ar` se importa desde `mind-ar/dist/mindar-image.prod.js` (worker ya inlineado).
  Su dependencia `canvas` solo hace falta en Node y se instala con `--ignore-scripts` en Windows.
- MindAR escribe las matrices del tracking en un ref mutable (`ARFrameState`) y `ARScene` las
  lee en `useFrame`: cero re-renders de React durante el tracking.

## Rutas

| Ruta | Descripción | Estado |
|---|---|---|
| `/` | Home con navegación y tutorial | ✅ Sprint 0 |
| `/upload` | Subida de vídeo, target `.mind`, timeline de mensajes | ✅ Sprint 2 & 3 |
| `/scan` | Escáner AR con MindAR + popups Framer Motion | ✅ Sprint 1, 2 & 3 |
| `/project/:id` | Detalle del proyecto y visor de mensajes programados | ✅ Sprint 2 & 3 |

## Decisiones técnicas cerradas

1. **Target:** el usuario sube la imagen completa de su tarjeta + el `.mind` ya compilado en [mindarjs.org](https://mindarjs.org) (MindAR trackea mejor imágenes con patrones que un QR puro).
2. **Chroma key:** pre-procesado una sola vez al subir el `.mp4` → se genera `.webm` con alfa. Sin filtrado por frame durante el escaneo.
3. **Mensajes MVP:** solo texto (`type: 'text'`); imágenes en Fase 2.
4. **Transparencia:** vídeo `.webm` con canal alfa preferido; si no, chroma key pre-procesado.

## Estructura

Ver `src/` según el árbol del Prompt MAESTRO v2 (components/, hooks/, store/, db/, types/, utils/, pages/, locales/).
