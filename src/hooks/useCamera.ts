import type { ScanError } from '../types/scan';

export type OpenCameraResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; error: ScanError };

/**
 * Abre UNA sola vez la cámara trasera (MindAR/nosotros nunca abrimos dos streams en paralelo).
 * `facingMode: { ideal: 'environment' }` prioriza la trasera en móvil pero permite
 * cualquier cámara en escritorios sin webcam "environment" (útil para pruebas).
 */
export async function openRearCamera(): Promise<OpenCameraResult> {
  // getUserMedia solo funciona en contextos seguros (HTTPS o localhost)
  if (!window.isSecureContext) {
    return { ok: false, error: 'https-required' };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { ok: false, error: 'no-camera' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
    return { ok: true, stream };
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        return { ok: false, error: 'permission-denied' };
      }
      // NotFoundError: sin cámara; OverconstrainedError: ninguna coincide;
      // NotReadableError: la cámara está ocupada por otra app (la tratamos como no disponible)
      if (
        err.name === 'NotFoundError' ||
        err.name === 'OverconstrainedError' ||
        err.name === 'NotReadableError' ||
        err.name === 'DevicesNotFoundError' ||
        err.name === 'TrackStartError'
      ) {
        return { ok: false, error: 'no-camera' };
      }
    }
    return { ok: false, error: 'no-camera' };
  }
}

/** Detiene todos los tracks de un stream (libera la cámara). */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
