import { chromium } from 'playwright-core';
import { copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function generateDemoVideo() {
  const dir = join(tmpdir(), 'ar-demo-video-' + Date.now());
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader'],
  });

  const context = await browser.newContext({
    viewport: { width: 360, height: 480 },
    recordVideo: { dir, size: { width: 360, height: 480 } },
  });

  const page = await context.newPage();

  // Create an animated SVG/Canvas avatar: a friendly 3D-styled animated presenter
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 360px;
          height: 480px;
          background: #00ff00;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
          overflow: hidden;
          color: white;
          position: relative;
        }
        .avatar-wrap {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .badge {
          margin-top: 16px;
          background: #4338ca;
          border: 2px solid #818cf8;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .title {
          margin-top: 8px;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          text-shadow: 0 2px 6px rgba(0,0,0,0.6);
        }
        .wave {
          display: inline-block;
          transform-origin: 70% 70%;
          animation: waveHand 1.5s infinite;
        }
        @keyframes waveHand {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-8deg); }
          45% { transform: rotate(14deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
      </style>
    </head>
    <body>
      <div class="avatar-wrap">
        <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Torso -->
          <rect x="50" y="130" width="100" height="70" rx="35" fill="url(#torsoGrad)" />
          <!-- Neck -->
          <rect x="85" y="105" width="30" height="30" rx="8" fill="#FCD34D" />
          <!-- Head -->
          <circle cx="100" cy="80" r="42" fill="#FDE68A" />
          <!-- Hair -->
          <path d="M58 75 C58 45 75 35 100 35 C125 35 142 45 142 75 C132 55 120 50 100 50 C80 50 68 55 58 75 Z" fill="#312E81" />
          <!-- Eyes -->
          <circle cx="86" cy="78" r="5" fill="#1E1B4B" />
          <circle cx="114" cy="78" r="5" fill="#1E1B4B" />
          <circle cx="88" cy="76" r="1.5" fill="#FFFFFF" />
          <circle cx="116" cy="76" r="1.5" fill="#FFFFFF" />
          <!-- Cheeks -->
          <circle cx="78" cy="86" r="6" fill="#F87171" opacity="0.6" />
          <circle cx="122" cy="86" r="6" fill="#F87171" opacity="0.6" />
          <!-- Smile -->
          <path d="M92 90 Q100 98 108 90" stroke="#1E1B4B" stroke-width="3" stroke-linecap="round" fill="none" />
          <!-- Glasses -->
          <circle cx="86" cy="78" r="12" stroke="#6366F1" stroke-width="2.5" fill="none" />
          <circle cx="114" cy="78" r="12" stroke="#6366F1" stroke-width="2.5" fill="none" />
          <line x1="98" y1="78" x2="102" y2="78" stroke="#6366F1" stroke-width="2.5" />
          <!-- Waving Hand -->
          <g class="wave" style="transform-origin: 155px 145px;">
            <circle cx="155" cy="130" r="14" fill="#FDE68A" />
            <path d="M145 130 Q148 118 155 116 Q162 118 165 130" fill="#FDE68A" />
          </g>
          <!-- Gradients -->
          <defs>
            <linearGradient id="torsoGrad" x1="50" y1="130" x2="150" y2="200" gradientUnits="userSpaceOnUse">
              <stop stop-color="#6366F1" />
              <stop offset="1" stop-color="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>
        <span class="badge">Asistente AR</span>
        <h2 class="title">¡Hola! Bienvenidos</h2>
      </div>
    </body>
    </html>
  `);

  // Record 3.5 seconds
  const end = Date.now() + 3500;
  let frame = 0;
  while (Date.now() < end) {
    await page.screenshot({ path: join(dir, `frame-${frame++}.png`) });
    await new Promise((r) => setTimeout(r, 66));
  }

  const video = page.video();
  await context.close();
  await browser.close();

  const videoPath = await video.path();
  const dest = join(process.cwd(), 'public', 'targets', 'demo-person.webm');
  await copyFile(videoPath, dest);
  console.log('Video demo creado con exito en:', dest);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {}
}

generateDemoVideo().catch(console.error);
