import { useEffect } from 'react';
import { useScanStore } from '../../store/useScanStore';

const FADE_IN_MS = 700; // duración del fade-in de la escena al detectar (RF-07)

/**
 * Orquesta la máquina de estados al detectar o perder el target:
 * - target encontrado en `scanning` → `detected` → (fade) → `playing`
 * - target perdido en `detected`/`playing` → `scanning`
 * Componente sin UI: solo efectos (RF-07).
 */
export function ScanStateHandler() {
  const state = useScanStore((s) => s.state);
  const isTracking = useScanStore((s) => s.isTracking);
  const setPhase = useScanStore((s) => s.setPhase);

  // Transiciones por disponibilidad del target
  useEffect(() => {
    if (state === 'scanning' && isTracking) {
      setPhase('detected');
    } else if (state === 'detected' && !isTracking) {
      setPhase('scanning');
    } else if (state === 'playing' && !isTracking) {
      setPhase('scanning');
    }
  }, [state, isTracking, setPhase]);

  // detected → playing tras el fade-in
  useEffect(() => {
    if (state !== 'detected') return;
    const timer = window.setTimeout(() => setPhase('playing'), FADE_IN_MS);
    return () => window.clearTimeout(timer);
  }, [state, setPhase]);

  return null;
}
