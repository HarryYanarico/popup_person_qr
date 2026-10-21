/**
 * Seguidor óptico de superficie (Optical Surface Patch Tracker).
 * Cuando el usuario fija la superficie en la mesa, captura un parche visual de la textura de la mesa
 * y rastrea su desplazamiento en los fotogramas del vídeo de la cámara en tiempo real.
 * Esto asegura que el avatar 3D permanezca literalmente anclado a la textura física de la mesa.
 */
export class VisualSurfaceTracker {
  private patchCanvas: HTMLCanvasElement;
  private patchCtx: CanvasRenderingContext2D | null;
  private frameCanvas: HTMLCanvasElement;
  private frameCtx: CanvasRenderingContext2D | null;

  private template: Uint8Array | null = null;
  private readonly patchSize = 32; // Parche de 32x32 píxeles
  private lastX = 0;
  private lastY = 0;
  private isTracking = false;

  constructor() {
    this.patchCanvas = document.createElement('canvas');
    this.patchCanvas.width = this.patchSize;
    this.patchCanvas.height = this.patchSize;
    this.patchCtx = this.patchCanvas.getContext('2d', { willReadFrequently: true });

    this.frameCanvas = document.createElement('canvas');
    this.frameCtx = this.frameCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Captura la textura de la superficie en el punto seleccionado (por defecto centro-inferior de la pantalla).
   */
  public captureSurface(video: HTMLVideoElement, normX = 0.5, normY = 0.65): boolean {
    if (!video.videoWidth || !video.videoHeight || !this.patchCtx) return false;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const px = Math.max(0, Math.min(vw - this.patchSize, Math.round(normX * vw - this.patchSize / 2)));
    const py = Math.max(0, Math.min(vh - this.patchSize, Math.round(normY * vh - this.patchSize / 2)));

    this.patchCtx.drawImage(
      video,
      px,
      py,
      this.patchSize,
      this.patchSize,
      0,
      0,
      this.patchSize,
      this.patchSize
    );

    const imgData = this.patchCtx.getImageData(0, 0, this.patchSize, this.patchSize);
    this.template = this.toGrayscale(imgData.data);
    this.lastX = px;
    this.lastY = py;
    this.isTracking = true;
    return true;
  }

  /**
   * Rastrea la textura capturada en el fotograma actual de la cámara.
   */
  public track(video: HTMLVideoElement): { tracked: boolean; normX: number; normY: number } {
    if (!this.isTracking || !this.template || !video.videoWidth || !this.frameCtx) {
      return { tracked: false, normX: 0.5, normY: 0.65 };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const searchRadius = 36; // Búsqueda local alrededor de la última posición conocida
    const searchW = this.patchSize + searchRadius * 2;
    const searchH = this.patchSize + searchRadius * 2;

    const sx = Math.max(0, Math.min(vw - searchW, this.lastX - searchRadius));
    const sy = Math.max(0, Math.min(vh - searchH, this.lastY - searchRadius));

    if (this.frameCanvas.width !== searchW || this.frameCanvas.height !== searchH) {
      this.frameCanvas.width = searchW;
      this.frameCanvas.height = searchH;
    }

    this.frameCtx.drawImage(video, sx, sy, searchW, searchH, 0, 0, searchW, searchH);
    const searchImg = this.frameCtx.getImageData(0, 0, searchW, searchH);
    const searchGray = this.toGrayscale(searchImg.data);

    let bestSad = Infinity;
    let bestDx = 0;
    let bestDy = 0;
    const pSize = this.patchSize;
    const tpl = this.template;

    // Búsqueda por diferencia absoluta (SAD) con paso 2 para alta velocidad (60 fps)
    for (let dy = 0; dy <= searchRadius * 2; dy += 2) {
      for (let dx = 0; dx <= searchRadius * 2; dx += 2) {
        let sad = 0;
        for (let r = 0; r < pSize; r += 2) {
          const tRow = r * pSize;
          const sRow = (dy + r) * searchW + dx;
          for (let c = 0; c < pSize; c += 2) {
            const diff = (tpl[tRow + c] ?? 0) - (searchGray[sRow + c] ?? 0);
            sad += diff < 0 ? -diff : diff;
          }
          if (sad >= bestSad) break; // Early exit
        }

        if (sad < bestSad) {
          bestSad = sad;
          bestDx = dx;
          bestDy = dy;
        }
      }
    }

    // Refinamiento fino de 1 píxel alrededor del mejor candidato
    for (let fdy = Math.max(0, bestDy - 1); fdy <= Math.min(searchRadius * 2, bestDy + 1); fdy++) {
      for (let fdx = Math.max(0, bestDx - 1); fdx <= Math.min(searchRadius * 2, bestDx + 1); fdx++) {
        let sad = 0;
        for (let r = 0; r < pSize; r += 2) {
          const tRow = r * pSize;
          const sRow = (fdy + r) * searchW + fdx;
          for (let c = 0; c < pSize; c += 2) {
            const diff = (tpl[tRow + c] ?? 0) - (searchGray[sRow + c] ?? 0);
            sad += diff < 0 ? -diff : diff;
          }
        }
        if (sad < bestSad) {
          bestSad = sad;
          bestDx = fdx;
          bestDy = fdy;
        }
      }
    }

    const numSamples = (pSize / 2) * (pSize / 2);
    const avgError = bestSad / numSamples;

    // Si el error es razonable, la superficie fue encontrada
    if (avgError < 45) {
      this.lastX = sx + bestDx;
      this.lastY = sy + bestDy;
      const centerX = this.lastX + pSize / 2;
      const centerY = this.lastY + pSize / 2;
      return {
        tracked: true,
        normX: centerX / vw,
        normY: centerY / vh,
      };
    }

    // Si el error es alto (movimiento muy brusco), mantener última posición
    return {
      tracked: false,
      normX: (this.lastX + pSize / 2) / vw,
      normY: (this.lastY + pSize / 2) / vh,
    };
  }

  public reset(): void {
    this.isTracking = false;
    this.template = null;
  }

  private toGrayscale(rgba: Uint8ClampedArray): Uint8Array {
    const len = rgba.length / 4;
    const gray = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const r = rgba[idx] ?? 0;
      const g = rgba[idx + 1] ?? 0;
      const b = rgba[idx + 2] ?? 0;
      // Fórmula de luminancia perceptiva
      gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
    }
    return gray;
  }
}
