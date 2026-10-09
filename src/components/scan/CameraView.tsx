import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Controller } from 'mind-ar/dist/mindar-image.prod.js';
import { openRearCamera, stopStream } from '../../hooks/useCamera';
import { useARAnchor } from '../../hooks/useARAnchor';
import { useScanStore } from '../../store/useScanStore';
import type { Project } from '../../types/project';
import type { ARFrameState } from '../../types/scan';

interface CameraViewProps {
  frameRef: RefObject<ARFrameState | null>;
  /** Proyecto seleccionado: su .mind (blob) y su vídeo se cargan al iniciar la sesión */
  project: Project | null;
}

/**
 * Dueño del stream de cámara y del Controller de MindAR (RF-01).
 * Nunca abre dos getUserMedia en paralelo: un solo stream durante toda la sesión.
 * Pinta el vídeo de fondo; la escena 3D va en ARScene (capa superpuesta).
 */
export function CameraView({ frameRef, project }: CameraViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controllerRef = useRef<Controller | null>(null);
  const mindUrlRef = useRef<string | null>(null);

  const session = useScanStore((s) => s.session);
  const setPhase = useScanStore((s) => s.setPhase);
  const setTracking = useScanStore((s) => s.setTracking);
  const fail = useScanStore((s) => s.fail);
  const { setup, onUpdate } = useARAnchor(frameRef);

  /** Libera cámara, vídeo y worker de MindAR. Idempotente. */
  const teardown = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      try {
        controller.stopProcessVideo();
        controller.worker.terminate();
        controller.dispose();
      } catch {
        // El controller puede haber fallado a medias: continuar con la limpieza
      }
      controllerRef.current = null;
    }

    if (mindUrlRef.current) {
      URL.revokeObjectURL(mindUrlRef.current);
      mindUrlRef.current = null;
    }

    stopStream(streamRef.current);
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (frameRef.current) {
      frameRef.current.anchorVisible = false;
    }
    setTracking(false);
  }, [frameRef, setTracking]);

  /**
   * Recalcula el "cover" del vídeo y la proyección de la cámara (puerto fiel de la
   * lógica de resize de MindAR: src/image-target/three.js). Si el cálculo cambia,
   * marca cameraDirty para que ARScene aplique los parámetros al camera de R3F.
   */
  const updateLayout = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    const controller = controllerRef.current;
    if (!video || !container || !controller) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (!video.videoWidth || !video.videoHeight || !containerWidth || !containerHeight) return;

    // Tamaño de representación del vídeo que cubre todo el contenedor (cover)
    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = containerWidth / containerHeight;
    let displayWidth: number;
    let displayHeight: number;
    if (videoRatio > containerRatio) {
      displayHeight = containerHeight;
      displayWidth = displayHeight * videoRatio;
    } else {
      displayWidth = containerWidth;
      displayHeight = displayWidth / videoRatio;
    }

    const proj = controller.getProjectionMatrix();
    const proj5 = proj[5];
    const proj10 = proj[10];
    const proj14 = proj[14];
    if (proj5 === undefined || proj10 === undefined || proj14 === undefined) return;

    const inputRatio = controller.inputWidth / controller.inputHeight;
    const inputAdjust =
      inputRatio > containerRatio
        ? video.width / controller.inputWidth
        : video.height / controller.inputHeight;

    let videoDisplayHeight: number;
    if (inputRatio > containerRatio) {
      videoDisplayHeight = containerHeight * inputAdjust;
    } else {
      videoDisplayHeight = (containerWidth / controller.inputWidth) * controller.inputHeight * inputAdjust;
    }

    // FOV vertical del trozo de vídeo realmente visible (corrige el recorte "cover")
    const fovAdjust = containerHeight / videoDisplayHeight;
    const fov = (2 * Math.atan((1 / proj5) * fovAdjust) * 180) / Math.PI;
    const near = proj14 / (proj10 - 1.0);
    const far = proj14 / (proj10 + 1.0);

    // Centrar el vídeo recortado dentro del contenedor
    video.style.width = `${displayWidth}px`;
    video.style.height = `${displayHeight}px`;
    video.style.left = `${(-(displayWidth - containerWidth) / 2).toFixed(1)}px`;
    video.style.top = `${(-(displayHeight - containerHeight) / 2).toFixed(1)}px`;

    const frame = frameRef.current;
    if (!frame) return;
    frame.cameraParams = { fov, near, far, aspect: containerWidth / containerHeight };
    frame.cameraDirty = true;
  }, [frameRef]);

  // Ciclo de vida de la sesión: session > 0 → arrancar; session = 0 → parar y limpiar.
  // El efecto depende solo de `session`, así las fases internas (loading-assets,
  // scanning, detected, playing) no interrumpen el arranque.
  useEffect(() => {
    if (session === 0) {
      teardown();
      return;
    }

    let cancelled = false;

    const run = async () => {
      const video = videoRef.current;
      if (!video) {
        fail('asset-missing');
        return;
      }

      // Validaciones del proyecto ANTES de pedir la cámara (RF-06)
      if (!project) {
        fail('asset-missing');
        return;
      }
      if (!project.targetMindBlob) {
        fail('target-missing');
        return;
      }
      const probe = document.createElement('video');
      if (project.videoMimeType && probe.canPlayType(project.videoMimeType) === '') {
        fail('unsupported-codec');
        return;
      }

      // 1) Permiso de cámara (una única llamada a getUserMedia)
      const camera = await openRearCamera();
      if (cancelled) {
        if (camera.ok) stopStream(camera.stream);
        return;
      }
      if (!camera.ok) {
        fail(camera.error);
        return;
      }
      streamRef.current = camera.stream;

      // 2) Reproducir el flujo en el <video>
      video.srcObject = camera.stream;
      try {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('video-load-error'));
          };
          const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('error', onError);
          };
          video.addEventListener('loadedmetadata', onLoaded);
          video.addEventListener('error', onError);
        });
        // muted + playsInline: autoplay permitido también en iOS
        await video.play();
      } catch {
        if (!cancelled) fail('unsupported-codec');
        return;
      }
      if (cancelled) return;

      // 3) Cargar el target .mind
      setPhase('loading-assets');
      const controller = new Controller({
        inputWidth: video.videoWidth,
        inputHeight: video.videoHeight,
        onUpdate,
      });
      controllerRef.current = controller;

      let dimensions: number[][];
      try {
        // El .mind vive como Blob en IndexedDB: MindAR lo carga desde una object URL
        const mindUrl = URL.createObjectURL(project.targetMindBlob);
        mindUrlRef.current = mindUrl;
        const result = await controller.addImageTargets(mindUrl);
        dimensions = result.dimensions;
      } catch {
        if (!cancelled) fail('target-load-error');
        return;
      }
      if (cancelled) return;

      setup(dimensions);

      // Dimensiones usadas por el resize (igual que MindAR)
      video.setAttribute('width', String(video.videoWidth));
      video.setAttribute('height', String(video.videoHeight));

      try {
        controller.dummyRun(video); // calienta los kernels antes del primer frame real
      } catch {
        // No fatal: seguimos aunque el warm-up falle
      }
      if (cancelled) return;

      updateLayout();
      controller.processVideo(video);
      setPhase('scanning');
    };

    run().catch(() => {
      if (!cancelled) fail('target-load-error');
    });

    return () => {
      cancelled = true;
      teardown();
    };
    // Dependencias: `session` reinicia el ciclo; `project` lo reinicia si cambia el
    // proyecto (el selector está oculto mientras hay sesión activa)
  }, [session, project, teardown, fail, setPhase, onUpdate, setup, updateLayout]);

  // Reactivar el layout al redimensionar o rotar el dispositivo
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(container);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [updateLayout]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <video ref={videoRef} className="absolute left-0 top-0" playsInline muted autoPlay />
    </div>
  );
}
