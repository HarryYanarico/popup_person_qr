import { Canvas, useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { RefObject } from 'react';
import { ARAnchor } from './ARAnchor';
import { PersonBillboard } from './PersonBillboard';
import type { Project } from '../../types/project';
import type { ARFrameState } from '../../types/scan';

interface ARSceneProps {
  frameRef: RefObject<ARFrameState | null>;
  project: Project | null;
}

interface ARCameraSyncProps {
  frameRef: RefObject<ARFrameState | null>;
}

/**
 * Sincroniza la cámara de R3F con la proyección que MindAR calcula del vídeo
 * (cover + FOV real). La cámara vive en el origen: las matrices del tracking ya
 * vienen en espacio de cámara.
 */
function ARCameraSync({ frameRef }: ARCameraSyncProps) {
  useFrame(({ camera }) => {
    const frame = frameRef.current;
    if (!frame || !frame.cameraDirty || !frame.cameraParams) return;

    const { fov, near, far, aspect } = frame.cameraParams;
    const cam = camera as PerspectiveCamera;
    cam.fov = fov;
    cam.near = near;
    cam.far = far;
    cam.aspect = aspect;
    cam.position.set(0, 0, 0);
    cam.rotation.set(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    frame.cameraDirty = false;
  });

  return null;
}

/**
 * Capa 3D transparente superpuesta al vídeo. Cada unidad = 1 ancho de tarjeta
 * (convención MindAR): la persona se dibuja a escala real sobre la tarjeta.
 */
export function ARScene({ frameRef, project }: ARSceneProps) {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 10, far: 100000, position: [0, 0, 0] }}
    >
      <ARCameraSync frameRef={frameRef} />
      <ARAnchor frameRef={frameRef}>
        {project ? <PersonBillboard frameRef={frameRef} project={project} /> : null}
      </ARAnchor>
    </Canvas>
  );
}
