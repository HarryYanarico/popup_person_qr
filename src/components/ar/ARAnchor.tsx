import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import type { RefObject } from 'react';
import type { ARFrameState } from '../../types/scan';

interface ARAnchorProps {
  frameRef: RefObject<ARFrameState | null>;
  children?: ReactNode;
}

/**
 * Grupo anclado al target (lado three.js): copia por frame la matriz que MindAR
 * calcula en CameraView/useARAnchor. `matrixAutoUpdate={false}` porque la matriz
 * viene del tracking, no de position/rotation/scale de React.
 */
export function ARAnchor({ frameRef, children }: ARAnchorProps) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    const frame = frameRef.current;
    if (!group || !frame) return;

    group.visible = frame.anchorVisible;
    if (frame.anchorVisible) {
      group.matrix.copy(frame.anchorMatrix);
      group.matrixWorldNeedsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} matrixAutoUpdate={false} visible={false}>
      {children}
    </group>
  );
}
