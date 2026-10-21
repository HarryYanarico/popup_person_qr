import { useEffect, useRef, useState, useCallback } from 'react';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';

const zee = new Vector3(0, 0, 1);
const euler = new Euler();
const q0 = new Quaternion();
const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90° alrededor del eje X

/**
 * Convierte los ángulos del giroscopio (alpha, beta, gamma) y la orientación de pantalla
 * a un cuaternión de cámara Three.js mirando hacia el dorso del teléfono.
 */
export function setDeviceQuaternion(
  target: Quaternion,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg: number
): void {
  const alphaRad = MathUtils.degToRad(alphaDeg);
  const betaRad = MathUtils.degToRad(betaDeg);
  const gammaRad = MathUtils.degToRad(gammaDeg);
  const screenRad = MathUtils.degToRad(screenAngleDeg);

  // 'YXZ' para dispositivos móviles en orientación portrait
  euler.set(betaRad, alphaRad, -gammaRad, 'YXZ');
  target.setFromEuler(euler);
  target.multiply(q1); // Ajusta la vista para la cámara trasera
  target.multiply(q0.setFromAxisAngle(zee, -screenRad));
}

/**
 * Pide permiso de giroscopio en iOS 13+ (debe llamarse dentro de un evento de usuario, ej. clic).
 */
export async function requestDeviceOrientationPermission(): Promise<boolean> {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
  ) {
    try {
      const res = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      return res === 'granted';
    } catch (err) {
      console.warn('Permiso de orientación denegado o cancelado:', err);
      return false;
    }
  }
  return true;
}

export interface DeviceOrientationState {
  isAvailable: boolean;
  isActive: boolean;
  quaternionRef: React.RefObject<Quaternion>;
  recenter: () => void;
}

/**
 * Hook para sincronizar la rotación del celular con la cámara Three.js.
 * Filtra el ruido del sensor con slerp y maneja transiciones 0-360° sin saltos bruscos.
 * Totalmente compatible con Android Chrome (evita doble evento absoluto/estándar) e iOS Safari.
 */
export function useDeviceOrientation(enabled = true): DeviceOrientationState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const quatRef = useRef<Quaternion>(new Quaternion());
  const initialAlphaRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const targetQuatRef = useRef(new Quaternion());

  const recenter = useCallback(() => {
    initialAlphaRef.current = null;
    isInitializedRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let hasReceivedEvent = false;
    let isAbsoluteActive = false;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.beta === undefined || e.gamma === null || e.gamma === undefined) {
        return;
      }

      if (!hasReceivedEvent) {
        hasReceivedEvent = true;
        setIsAvailable(true);
        setIsActive(true);
      }

      const rawAlpha = e.alpha ?? 0;
      if (initialAlphaRef.current === null && e.alpha !== null) {
        initialAlphaRef.current = rawAlpha;
      }

      // Yaw relativo normalizado al rango [-180, 180] para evitar saltos de 360°
      let diff = initialAlphaRef.current !== null ? rawAlpha - initialAlphaRef.current : 0;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      const relativeAlpha = diff;

      const screenAngle = (window.screen?.orientation?.angle ?? (window.orientation as number) ?? 0);

      // Calcular cuaternión objetivo con la rotación real del teléfono
      setDeviceQuaternion(targetQuatRef.current, relativeAlpha, e.beta, e.gamma, screenAngle);

      // Suavizado slerp para eliminar micro-vibraciones involuntarias del acelerómetro/giroscopio
      if (!isInitializedRef.current) {
        quatRef.current.copy(targetQuatRef.current);
        isInitializedRef.current = true;
      } else {
        quatRef.current.slerp(targetQuatRef.current, 0.45);
      }
    };

    const handleAbsolute = (e: DeviceOrientationEvent) => {
      isAbsoluteActive = true;
      handleOrientation(e);
    };

    const handleStandard = (e: DeviceOrientationEvent) => {
      // Si el evento absoluto ya está activo (Android Chrome), ignorar el estándar para no duplicar ticks
      if (isAbsoluteActive) return;
      handleOrientation(e);
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
    }
    window.addEventListener('deviceorientation', handleStandard, true);

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
      }
      window.removeEventListener('deviceorientation', handleStandard, true);
    };
  }, [enabled]);

  return {
    isAvailable,
    isActive,
    quaternionRef: quatRef,
    recenter,
  };
}
