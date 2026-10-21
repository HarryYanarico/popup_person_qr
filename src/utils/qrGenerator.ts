import QRCode from 'qrcode';

/**
 * Genera el payload canónico para el QR del proyecto.
 * Incluye la URL directa para que también funcione si se escanea con la cámara nativa del móvil.
 */
export function getProjectQRPayload(projectId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/scan?project=${projectId}&mode=qr`;
  }
  return `arproject:${projectId}`;
}

/**
 * Extrae el projectId de un texto escaneado por el lector QR.
 */
export function extractProjectIdFromQR(qrData: string): string | null {
  if (!qrData) return null;
  // Formato 1: URL con ?project=<id>
  try {
    const url = new URL(qrData);
    const p = url.searchParams.get('project');
    if (p) return p;
  } catch {
    // No es una URL válida, continuar con prefijos
  }

  // Formato 2: arproject:<id>
  if (qrData.startsWith('arproject:')) {
    return qrData.replace('arproject:', '').trim();
  }

  // Formato 3: id directo
  if (/^[A-Za-z0-9_-]{6,36}$/.test(qrData)) {
    return qrData;
  }

  return null;
}

/**
 * Genera una imagen PNG del código QR puro en alta resolución.
 */
export async function generateQRCodeDataURL(text: string, size = 600): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#09090b', // zinc-950
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

export interface PrintableCardOptions {
  projectName: string;
  projectId: string;
  physicalWidthCm?: number;
}

/**
 * Genera un diseño gráfico completo de tarjeta en PNG lista para imprimir (relación estándar 3:2 o tarjeta de visita).
 * Incluye bordes de guía, código QR en alta calidad y texto instructivo.
 */
export async function generatePrintableCardDataURL(options: PrintableCardOptions): Promise<string> {
  const qrPayload = getProjectQRPayload(options.projectId);

  // Renderizar el código QR directamente en un canvas en memoria (100% síncrono, sin new Image ni onload)
  const qrSize = 440;
  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = qrSize;
  qrCanvas.height = qrSize;

  await QRCode.toCanvas(qrCanvas, qrPayload, {
    width: qrSize,
    margin: 1,
    color: {
      dark: '#09090b', // zinc-950
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  const canvas = document.createElement('canvas');
  // 1200 x 800 px (3:2 estándar, excelente resolución de impresión)
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear contexto 2D');

  // Fondo blanco limpio para ahorrar tinta y asegurar máximo contraste al escanear
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Marco exterior estilizado
  ctx.strokeStyle = '#e4e4e7'; // zinc-200
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  // Esquinas de calibración AR (Corner brackets)
  const bracketSize = 50;
  const bracketMargin = 50;
  ctx.strokeStyle = '#4f46e5'; // indigo-600
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  // Esquina superior izquierda
  ctx.beginPath();
  ctx.moveTo(bracketMargin, bracketMargin + bracketSize);
  ctx.lineTo(bracketMargin, bracketMargin);
  ctx.lineTo(bracketMargin + bracketSize, bracketMargin);
  ctx.stroke();

  // Esquina superior derecha
  ctx.beginPath();
  ctx.moveTo(canvas.width - bracketMargin - bracketSize, bracketMargin);
  ctx.lineTo(canvas.width - bracketMargin, bracketMargin);
  ctx.lineTo(canvas.width - bracketMargin, bracketMargin + bracketSize);
  ctx.stroke();

  // Esquina inferior izquierda
  ctx.beginPath();
  ctx.moveTo(bracketMargin, canvas.height - bracketMargin - bracketSize);
  ctx.lineTo(bracketMargin, canvas.height - bracketMargin);
  ctx.lineTo(bracketMargin + bracketSize, canvas.height - bracketMargin);
  ctx.stroke();

  // Esquina inferior derecha
  ctx.beginPath();
  ctx.moveTo(canvas.width - bracketMargin - bracketSize, canvas.height - bracketMargin);
  ctx.lineTo(canvas.width - bracketMargin, canvas.height - bracketMargin);
  ctx.lineTo(canvas.width - bracketMargin, canvas.height - bracketMargin - bracketSize);
  ctx.stroke();

  // Encabezado
  ctx.fillStyle = '#18181b'; // zinc-900
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.projectName || 'Tarjeta de Realidad Aumentada', canvas.width / 2, 110);

  ctx.fillStyle = '#6366f1'; // indigo-500
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚡ TARJETA AR INTERACTIVA', canvas.width / 2, 145);

  // Dibujar el Código QR centrado
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 175;

  // Borde alrededor del QR
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 3;
  ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Pie de página instructivo
  ctx.fillStyle = '#27272a'; // zinc-800
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('📷 1. Abre el escáner de la app  •  2. Apunta a este código QR', canvas.width / 2, 670);

  ctx.fillStyle = '#71717a'; // zinc-500
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  const widthNote = options.physicalWidthCm ? `Ancho recomendado: ~${options.physicalWidthCm} cm  |  ` : '';
  ctx.fillText(`${widthNote}La animación 3D aparecerá automáticamente sobre la tarjeta`, canvas.width / 2, 715);

  return canvas.toDataURL('image/png');
}

/**
 * Limpia y normaliza el nombre de archivo para evitar errores del sistema de archivos.
 */
export function sanitizeFilename(name: string): string {
  return (name || 'tarjeta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'tarjeta';
}

/**
 * Convierte un Data URL (base64) a un objeto Blob nativo.
 */
export function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const firstPart = parts[0] || '';
  const mimeMatch = firstPart.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const byteString = atob(parts[1] || '');
  const len = byteString.length;
  const uint8Array = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mime });
}

/**
 * Descarga de manera segura un Blob sin disparar listeners globales de navegación ni router.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.style.display = 'none';
  link.href = blobUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.rel = 'noopener noreferrer';

  // Evitar que el evento de clic burbujee hacia listeners de React Router en el document
  link.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

/**
 * Descarga un Data URL convirtiéndolo primero a Blob y Blob URL (evita errores con URLs base64 gigantes).
 */
export function downloadDataURL(dataUrl: string, filename: string): void {
  try {
    const blob = dataURLToBlob(dataUrl);
    downloadBlob(blob, filename);
  } catch (err) {
    console.error('Error al procesar descarga de PNG:', err);
    // Fallback de emergencia
    const fallbackLink = document.createElement('a');
    fallbackLink.href = dataUrl;
    fallbackLink.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    fallbackLink.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    setTimeout(() => {
      if (fallbackLink.parentNode) fallbackLink.parentNode.removeChild(fallbackLink);
    }, 500);
  }
}

/**
 * Abre la ventana nativa de impresión con la tarjeta formateada para papel.
 */
export function printCardDataURL(dataUrl: string, title = 'Tarjeta AR'): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Imprimir ${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #fff;
            padding: 20px;
            font-family: system-ui, sans-serif;
          }
          .card-container {
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          img {
            max-width: 100%;
            height: auto;
            border: 1px dashed #ccc;
            border-radius: 8px;
          }
          .hint {
            margin-top: 16px;
            color: #666;
            font-size: 13px;
          }
          @media print {
            body { padding: 0; }
            .hint { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <img src="${dataUrl}" alt="Tarjeta AR" />
          <p class="hint">Recorta por el borde exterior e imprímela sin escalar.</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
