// Estados del escáner AR (Prompt MAESTRO v2 — RF-07)

export type ScanMode = 'surface' | 'qr';

export type ScanState =
  | 'idle'
  | 'requesting-permission'
  | 'loading-assets'
  | 'scanning'
  | 'detected'
  | 'playing'
  | 'error';

// Errores explícitos (RF-08)
export type ScanError =
  | 'permission-denied'
  | 'no-camera'
  | 'https-required'
  | 'asset-missing'
  | 'target-missing'
  | 'unsupported-codec'
  | 'target-load-error';

import { Matrix4 } from 'three';

// Parámetros de cámara que MindAR calcula en cada resize (copiados al camera de R3F)
export interface ARCameraParams {
  fov: number;
  near: number;
  far: number;
  aspect: number;
}

// Estado mutable compartido entre CameraView (escritor, fuera de React) y ARScene (lector, por frame).
// Se actualiza en callbacks de MindAR y se lee en useFrame: NUNCA se pasa por React state
// para no provocar re-renders a 60 fps.
export interface ARFrameState {
  anchorMatrix: Matrix4;
  anchorVisible: boolean;
  cameraParams: ARCameraParams | null;
  cameraDirty: boolean;
}

export function createARFrameState(): ARFrameState {
  return {
    anchorMatrix: new Matrix4(),
    anchorVisible: false,
    cameraParams: null,
    cameraDirty: false,
  };
}
