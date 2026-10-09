import { useEffect, useRef, useState } from 'react';
import type { TimelineMessage } from '../types/project';

interface VideoTimelineResult {
  currentTime: number;
  activeMessages: TimelineMessage[];
}

/**
 * Hook para orquestar la línea de tiempo de mensajes emergentes (RF-05).
 * - Lee currentTime del vídeo con alta precisión (requestAnimationFrame mientras reproduce).
 * - Filtra qué mensajes deben mostrarse en el segundo actual según timestamp y duración.
 * - Respeta pausas (cuando se pierde el QR de vista, el vídeo se pausa y los mensajes no avanzan).
 * - Maneja el bucle: al reiniciar el vídeo a 0, resetea la línea de tiempo.
 */
export function useVideoTimeline(
  messages: TimelineMessage[],
  videoElement: HTMLVideoElement | null,
): VideoTimelineResult {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!videoElement) return;

    const checkTime = () => {
      const time = videoElement.currentTime;
      lastTimeRef.current = time;
      setCurrentTime(time);
    };

    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      if (!videoElement.paused && !videoElement.ended) {
        checkTime();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    // Iniciar loop de muestreo suave
    rafRef.current = requestAnimationFrame(loop);

    // Eventos estándar del elemento HTMLVideo
    const onTimeUpdate = () => checkTime();
    const onSeeked = () => checkTime();
    const onEnded = () => checkTime();

    videoElement.addEventListener('timeupdate', onTimeUpdate);
    videoElement.addEventListener('seeked', onSeeked);
    videoElement.addEventListener('ended', onEnded);

    return () => {
      isRunning = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      videoElement.removeEventListener('timeupdate', onTimeUpdate);
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('ended', onEnded);
    };
  }, [videoElement]);

  // Mensajes que deben estar visibles en el segundo actual
  const activeMessages = messages.filter((m) => {
    const start = m.timestamp;
    const end = m.timestamp + m.duration;
    return currentTime >= start && currentTime < end;
  });

  return {
    currentTime,
    activeMessages,
  };
}
