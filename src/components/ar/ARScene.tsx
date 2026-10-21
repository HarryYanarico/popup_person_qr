import { Canvas, useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { RefObject } from 'react';
import { ARAnchor } from './ARAnchor';
import { PersonBillboard } from './PersonBillboard';
import { SurfaceReticle } from './SurfaceReticle';
import { SurfaceAnchor } from './SurfaceAnchor';
import { useScanStore } from '../../store/useScanStore';
import { useDeviceOrientation, type DeviceOrientationState } from '../../hooks/useDeviceOrientation';
import type { Project } from '../../types/project';
import type { ARFrameState, ScanMode } from '../../types/scan';

interface ARSceneProps {
  frameRef: RefObject<ARFrameState | null>;
  project: Project | null;
  orientation?: DeviceOrientationState;
}

interface ARCameraSyncProps {
  frameRef: RefObject<ARFrameState | null>;
  scanMode: ScanMode;
  orientation: DeviceOrientationState;
}

/**
 * Sincroniza la cámara de R3F:
 * - Aplica la orientación 3D real del giroscopio del teléfono en ambos modos ('surface' y 'qr').
 * - Esto permite que el usuario gire y mueva la cámara alrededor del objeto mientras
 *   este permanece firmemente fijado en la mesa o tarjeta física.
 */
function ARCameraSync({ frameRef, scanMode: _scanMode, orientation }: ARCameraSyncProps) {
  useFrame(({ camera }) => {
    const frame = frameRef.current;
    const cam = camera as PerspectiveCamera;

    cam.near = 0.05;
    cam.far = 1000;
    cam.position.set(0, 0, 0);

    if (orientation.isActive && orientation.quaternionRef.current) {
      // Usar orientación 3D real del teléfono móvil
      cam.quaternion.copy(orientation.quaternionRef.current);
    } else {
      // Inclinación inicial natural hacia la mesa (plano horizontal)
      cam.rotation.set(-0.35, 0, 0);
    }

    if (frame?.cameraParams) {
      cam.fov = frame.cameraParams.fov;
      cam.aspect = frame.cameraParams.aspect;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);
  });

  return null;
}

/**
 * Capa 3D transparente superpuesta al vídeo de la cámara real.
 * - En 'surface' (Modo Demo): muestra retícula de superficie plana y ancla fija al pulsar el botón.
 * - En 'qr' (Modo Tarjeta): muestra la animación anclada exactamente sobre la tarjeta física en el mundo.
 */
export function ARScene({ frameRef, project, orientation: orientationProp }: ARSceneProps) {
  const scanMode = useScanStore((s) => s.scanMode);
  const isSurfaceFixed = useScanStore((s) => s.isSurfaceFixed);
  const fallbackOrientation = useDeviceOrientation(true);
  const orientation = orientationProp ?? fallbackOrientation;

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 0.05, far: 1000, position: [0, 0, 0] }}
    >
      <ARCameraSync frameRef={frameRef} scanMode={scanMode} orientation={orientation} />

      {scanMode === 'surface' ? (
        <>
          {!isSurfaceFixed && (
            <>
              {/* Rejilla 3D holográfica que marca la superficie plana detectada (mesa/suelo) */}
              <gridHelper args={[6, 18, '#818cf8', '#312e81']} position={[0, -0.75, -1.8]} />
              <SurfaceReticle />
            </>
          )}
          <SurfaceAnchor>
            {project ? <PersonBillboard frameRef={frameRef} project={project} /> : null}
          </SurfaceAnchor>
        </>
      ) : (
        <ARAnchor frameRef={frameRef}>
          {project ? <PersonBillboard frameRef={frameRef} project={project} /> : null}
        </ARAnchor>
      )}
    </Canvas>
  );
}
