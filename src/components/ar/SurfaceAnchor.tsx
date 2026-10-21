import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { useScanStore } from '../../store/useScanStore';

interface SurfaceAnchorProps {
  children?: ReactNode;
}

/**
 * Ancla espacial fija para el Modo Demo (Superficie Plana).
 * Fija la animación en las coordenadas 3D de la mesa/suelo elegidas por el usuario.
 * A medida que el usuario gira y mueve el teléfono, la animación permanece fija en ese lugar físico.
 */
export function SurfaceAnchor({ children }: SurfaceAnchorProps) {
  const isSurfaceFixed = useScanStore((s) => s.isSurfaceFixed);
  const surfaceScale = useScanStore((s) => s.surfaceScale);
  const surfacePosition = useScanStore((s) => s.surfacePosition);
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.visible = isSurfaceFixed;
  });

  if (!isSurfaceFixed) return null;

  // Orientar el ancla para que el avatar mire naturalmente hacia el usuario en el origen (0, 0, 0)
  const angleY = Math.atan2(-surfacePosition[0], -surfacePosition[2]);

  return (
    <group
      ref={groupRef}
      position={surfacePosition}
      rotation={[0, angleY, 0]}
      scale={[surfaceScale, surfaceScale, surfaceScale]}
    >
      {/* Sombra de contacto suave en el plano de la mesa */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>

      {/* Halo de luz sutil en la base */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.52, 32]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
      </mesh>

      {/* PersonBillboard elevado sobre el plano para que los pies toquen la mesa */}
      <group position={[0, 0.65, 0]}>
        {children}
      </group>
    </group>
  );
}
