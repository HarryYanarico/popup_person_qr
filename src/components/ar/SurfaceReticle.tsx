import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, Vector3 } from 'three';
import { useScanStore } from '../../store/useScanStore';

const forwardVec = new Vector3();
const targetPos = new Vector3();
const groundHeight = -0.75;

/**
 * Retícula 3D dinámica proyectada sobre el plano de la superficie real (mesa/suelo).
 * Utiliza el vector de visión de la cámara para realizar un raycast hacia el plano Y = -0.75m.
 * A medida que el usuario inclina o mueve su celular, la retícula se desplaza por la mesa.
 */
export function SurfaceReticle() {
  const groupRef = useRef<Group>(null);
  const pulseRingRef = useRef<Mesh>(null);
  const innerDiscRef = useRef<Mesh>(null);

  useFrame(({ camera, clock }) => {
    // 1. Calcular el vector hacia adelante de la cámara según el giroscopio del móvil
    forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // 2. Intersección con el plano horizontal del suelo / mesa
    if (forwardVec.y < -0.05) {
      // El celular está apuntando hacia abajo hacia la mesa o suelo
      const dist = (groundHeight - camera.position.y) / forwardVec.y;
      const clampedDist = Math.max(0.6, Math.min(dist, 4.0));
      targetPos.set(
        camera.position.x + forwardVec.x * clampedDist,
        groundHeight,
        camera.position.z + forwardVec.z * clampedDist
      );
    } else {
      // Si apunta hacia el horizonte o arriba, proyectar a distancia cómoda al frente
      targetPos.set(
        camera.position.x + forwardVec.x * 1.8,
        groundHeight,
        camera.position.z + forwardVec.z * 1.8
      );
    }

    if (groupRef.current) {
      // Movimiento suave del retículo siguiendo el movimiento de la cámara
      groupRef.current.position.lerp(targetPos, 0.25);

      // Guardar la posición candidata actual para el momento del clic en "Fijar superficie"
      const cur = groupRef.current.position;
      const prev = useScanStore.getState().candidateSurfacePosition;
      if (Math.abs(cur.x - prev[0]) > 0.04 || Math.abs(cur.z - prev[2]) > 0.04) {
        useScanStore.getState().setCandidateSurfacePosition([cur.x, cur.y, cur.z]);
      }
    }

    // Animación continua de pulso holográfico
    const t = clock.getElapsedTime();
    if (pulseRingRef.current) {
      const s = 1 + Math.sin(t * 3.5) * 0.12;
      pulseRingRef.current.scale.set(s, s, s);
    }

    if (innerDiscRef.current) {
      const mat = innerDiscRef.current.material as { opacity?: number };
      if (mat) {
        mat.opacity = 0.22 + Math.sin(t * 3.5) * 0.08;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, groundHeight, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Disco base holográfico en la superficie */}
      <mesh ref={innerDiscRef} position={[0, 0, 0.005]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.25} />
      </mesh>

      {/* Anillo de pulso dinámico */}
      <mesh ref={pulseRingRef} position={[0, 0, 0.008]}>
        <ringGeometry args={[0.62, 0.66, 48]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.5} />
      </mesh>

      {/* Anillo exterior blanco con borde */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[0.52, 0.54, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>

      {/* Marcadores cardinales */}
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.53, Math.sin(angle) * 0.53, 0.015]}
          rotation={[0, 0, angle]}
        >
          <planeGeometry args={[0.1, 0.03]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Punto focal en el centro */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
