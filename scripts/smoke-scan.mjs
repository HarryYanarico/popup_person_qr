// Prueba de humo del escáner (Sprint 2): arranca `vite preview`, siembra un
// proyecto real en IndexedDB (vídeo WebM grabado con Playwright + .mind/png de
// /targets) y comprueba en Chrome headless con cámara falsa que la cadena
// selector de proyecto → permiso → carga del .mind → `scanning` → salida limpia
// funciona sin errores de consola.
//
// Uso:  npm run build && npm run smoke
// Nota: el grabador de vídeo de Playwright necesita ffmpeg (una sola vez):
//       node node_modules/playwright-core/cli.js install ffmpeg
// Opcional: SMOKE_SHOT_DIR=<carpeta> para guardar los screenshots en otro sitio.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const SHOT_DIR = process.env.SMOKE_SHOT_DIR ?? process.cwd();
const PROJECT_ID = 'smoke-project';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // servidor aún arrancando
    }
    await sleep(300);
  }
  throw new Error(`El servidor no respondió en ${timeoutMs} ms: ${url}`);
}

/**
 * Graba un WebM mínimo (pelota verde animada) con el sistema de vídeo de Playwright:
 * MediaRecorder no produce fotogramas en Chrome headless sin compositor.
 */
async function recordSampleVideo(browser) {
  const dir = join(tmpdir(), 'ar-smoke-video');
  const context = await browser.newContext({
    viewport: { width: 320, height: 480 },
    recordVideo: { dir, size: { width: 320, height: 480 } },
  });
  const page = await context.newPage();
  await page.setContent(`
    <html><body style="margin:0;background:#00b140">
      <div id="ball" style="position:absolute;left:130px;top:200px;width:60px;height:60px;border-radius:50%;background:#fff"></div>
      <script>
        let t = 0;
        setInterval(() => {
          t += 0.1;
          document.getElementById('ball').style.top = (200 + Math.sin(t) * 120) + 'px';
        }, 50);
      </script>
    </body></html>
  `);
  // Screenshots durante la grabación: fuerzan fotogramas en headless
  const end = Date.now() + 1500;
  let n = 0;
  while (Date.now() < end) {
    await page.screenshot({ path: join(dir, `paint-${n++}.png`) });
    await sleep(100);
  }
  const video = page.video();
  await context.close();
  return readFile(await video.path());
}

/**
 * Guarda el proyecto en IndexedDB (mismo origen): vídeo WebM (base64 desde Node)
 * + .mind y png reales servidos por la app.
 */
function seedProject(page, videoBase64) {
  return page.evaluate(
    async ({ projectId, videoBase64: b64 }) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const videoBlob = new Blob([bytes], { type: 'video/webm' });

      const mindBlob = await (await fetch('/targets/card.mind')).blob();
      const imageBlob = await (await fetch('/targets/card.png')).blob();

      const project = {
        id: projectId,
        name: 'Proyecto de prueba',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        videoBlob,
        videoMimeType: 'video/webm',
        hasAlpha: false,
        targetImageBlob: imageBlob,
        targetMindBlob: mindBlob,
        targetName: 'card.mind',
        targetPhysicalWidthCm: 10,
        messages: [],
        loop: true,
        muted: false,
      };

      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('ar-qr-scanner', 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('projects')) {
            req.result.createObjectStore('projects', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('projects', 'readwrite');
        tx.objectStore('projects').put(project);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      return { videoBytes: videoBlob.size, mindBytes: mindBlob.size };
    },
    { projectId: PROJECT_ID, videoBase64 },
  );
}

async function main() {
  // En Windows, Node no permite hacer spawn directo de .cmd sin shell (EINVAL)
  const preview = spawn(
    'cmd.exe',
    ['/c', 'npm.cmd run preview -- --port ' + PORT + ' --strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: false },
  );
  let previewLog = '';
  preview.stdout.on('data', (d) => (previewLog += d));
  preview.stderr.on('data', (d) => (previewLog += d));

  let browser;
  try {
    await waitForServer(BASE);
    console.log(`[smoke] servidor preview listo en ${BASE}`);

    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    });

    // Vídeo de prueba grabado antes de abrir la app (WebM real, decodificable)
    const videoBase64 = (await recordSampleVideo(browser)).toString('base64');

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      permissions: ['camera'],
    });
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    // 1) Home: crea la BD y comprueba la lista de proyectos (vacía de momento)
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByText('Proyectos guardados').waitFor({ timeout: 15000 });
    await page.getByText('Aún no tienes proyectos.').waitFor({ timeout: 15000 });
    await page.screenshot({ path: `${SHOT_DIR}/smoke-0-home.png` });
    console.log('[smoke] OK: Home con lista de proyectos vacía');

    // 2) Siembra un proyecto real en IndexedDB (vídeo WebM + .mind + png)
    const seeded = await seedProject(page, videoBase64);
    console.log(
      `[smoke] proyecto sembrado (vídeo ${seeded.videoBytes} B, .mind ${seeded.mindBytes} B)`,
    );

    // 3) /scan?project=<id>: idle con el proyecto preseleccionado
    await page.goto(`${BASE}/scan?project=${PROJECT_ID}`, { waitUntil: 'networkidle' });
    await page.getByText('Elige un proyecto y activa la cámara').waitFor({ timeout: 15000 });
    const selected = await page.locator('#project-select').inputValue();
    if (selected !== PROJECT_ID) {
      throw new Error(`proyecto preseleccionado incorrecto: "${selected}"`);
    }
    await page.screenshot({ path: `${SHOT_DIR}/smoke-1-idle.png` });
    console.log('[smoke] OK: idle con proyecto preseleccionado desde la URL');

    // 4) Activar cámara → debe llegar a `scanning` (target cargado + tracking activo)
    await page.getByRole('button', { name: 'Activar cámara' }).click();
    await page.getByText('Apunta a tu tarjeta').waitFor({ timeout: 90000 });
    await page.screenshot({ path: `${SHOT_DIR}/smoke-2-scanning.png` });
    console.log('[smoke] OK: estado scanning alcanzado (cámara + .mind del proyecto)');

    // 5) Salir → vuelve a idle (valida la limpieza: stream + worker)
    await page.getByRole('button', { name: 'Salir' }).click();
    await page.getByText('Elige un proyecto y activa la cámara').waitFor({ timeout: 15000 });
    console.log('[smoke] OK: salida limpia de vuelta a idle');

    if (errors.length > 0) {
      console.log('[smoke] ERRORES detectados:');
      for (const e of errors) console.log(`  - ${e}`);
      process.exitCode = 1;
    } else {
      console.log('[smoke] Sin errores de consola ni de página ✓');
    }
  } catch (err) {
    console.error('[smoke] FALLÓ:', err.message);
    if (previewLog) console.error('[smoke] log del preview:\n' + previewLog.slice(-2000));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    preview.kill();
  }
}

main();
