import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import jsQR from 'jsqr';
import { openRearCamera, stopStream } from '../../hooks/useCamera';
import { useScanStore } from '../../store/useScanStore';
import { QRPoseTracker } from '../../utils/qrPose';
import type { DeviceOrientationState } from '../../hooks/useDeviceOrientation';
import type { Project } from '../../types/project';
import type { ARFrameState } from '../../types/scan';

interface CameraViewProps {
  frameRef: RefObject<ARFrameState | null>;
  project: Project | null;
  orientation?: DeviceOrientationState;
}

/**
 * Dueño del stream de cámara y del seguimiento en tiempo real (RF-01).
 * Soporta dos modos:
 * 1. Modo 'surface' (Demo): proyección en superficie plana con orientación del giroscopio.
 * 2. Modo 'qr': escaneo del código QR impreso en tarjeta; solo al escanear aparece la animación fija en el mundo.
 */
export function CameraView({ frameRef, project, orientation }: CameraViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseTrackerRef = useRef(new QRPoseTracker());
  const orientationRef = useRef(orientation);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  const session = useScanStore((s) => s.session);
  const scanMode = useScanStore((s) => s.scanMode);
  const isSurfaceFixed = useScanStore((s) => s.isSurfaceFixed);
  const setPhase = useScanStore((s) => s.setPhase);
  const setTracking = useScanStore((s) => s.setTracking);
  const setDetectedQrPayload = useScanStore((s) => s.setDetectedQrPayload);
  const fail = useScanStore((s) => s.fail);

  /** Libera cámara y vídeo. */
  const teardown = useCallback(() => {
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
    poseTrackerRef.current.reset();
    setTracking(false);
  }, [frameRef, setTracking]);

  /** Recalcula el cover del vídeo y los parámetros de proyección de la cámara. */
  const updateLayout = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (!video.videoWidth || !video.videoHeight || !containerWidth || !containerHeight) return;

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

    video.style.width = `${displayWidth}px`;
    video.style.height = `${displayHeight}px`;
    video.style.left = `${(-(displayWidth - containerWidth) / 2).toFixed(1)}px`;
    video.style.top = `${(-(displayHeight - containerHeight) / 2).toFixed(1)}px`;

    const frame = frameRef.current;
    if (!frame) return;

    // FOV vertical estándar móvil
    const fov = 48;
    frame.cameraParams = {
      fov,
      near: 0.05,
      far: 1000,
      aspect: containerWidth / containerHeight,
    };
    frame.cameraDirty = true;
  }, [frameRef]);

  // Actualizar visibilidad en modo superficie al fijar
  useEffect(() => {
    if (scanMode === 'surface') {
      if (frameRef.current) {
        frameRef.current.anchorVisible = isSurfaceFixed;
      }
      setTracking(isSurfaceFixed);
    }
  }, [scanMode, isSurfaceFixed, frameRef, setTracking]);

  // Ciclo principal de cámara y detección
  useEffect(() => {
    if (session === 0) {
      teardown();
      return;
    }

    let cancelled = false;
    let animFrameId: number | null = null;

    const run = async () => {
      const video = videoRef.current;
      if (!video) {
        fail('asset-missing');
        return;
      }

      if (!project) {
        fail('asset-missing');
        return;
      }

      // Validar soporte de códec de vídeo
      const probe = document.createElement('video');
      if (project.videoMimeType && probe.canPlayType(project.videoMimeType) === '') {
        fail('unsupported-codec');
        return;
      }

      // 1) Solicitar cámara
      setPhase('requesting-permission');
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

      // 2) Conectar stream al <video>
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
        await video.play();
      } catch {
        if (!cancelled) fail('unsupported-codec');
        return;
      }
      if (cancelled) return;

      updateLayout();
      setPhase('scanning');

      // 3) Si estamos en modo QR, iniciar el lector de código QR en tiempo real
      if (scanMode === 'qr') {
        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!offCtx) return;

        let lastScanTime = 0;
        const qrScanIntervalMs = 40; // ~25 fps de detección para máxima fluidez y bajo consumo

        const scanLoop = () => {
          if (cancelled) return;

          const now = performance.now();
          if (now - lastScanTime >= qrScanIntervalMs && video.readyState >= 2) {
            lastScanTime = now;

            // Escala reducida para escaneo instantáneo (ancho máx 480px)
            const targetWidth = Math.min(480, video.videoWidth || 480);
            const scale = targetWidth / video.videoWidth;
            const targetHeight = Math.round(video.videoHeight * scale);

            if (offCanvas.width !== targetWidth || offCanvas.height !== targetHeight) {
              offCanvas.width = targetWidth;
              offCanvas.height = targetHeight;
            }

            offCtx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const imageData = offCtx.getImageData(0, 0, targetWidth, targetHeight);
            const code = jsQR(imageData.data, targetWidth, targetHeight, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.location) {
              setDetectedQrPayload(code.data);

              const container = containerRef.current;
              const cWidth = container?.clientWidth || 360;
              const cHeight = container?.clientHeight || 640;

              // Calcular pose 3D de la tarjeta QR
              const matrix = poseTrackerRef.current.computeMatrix(code, {
                canvasWidth: targetWidth,
                canvasHeight: targetHeight,
                containerWidth: cWidth,
                containerHeight: cHeight,
                fov: frameRef.current?.cameraParams?.fov || 48,
              });

              if (frameRef.current) {
                const curOrient = orientationRef.current;
                if (curOrient?.isActive && curOrient.quaternionRef.current) {
                  // Transformar a coordenadas fijas de mundo Three.js según la orientación real del teléfono
                  const camPos = new Vector3();
                  const camQuat = new Quaternion();
                  const camScale = new Vector3();
                  matrix.decompose(camPos, camQuat, camScale);

                  const phoneQuat = curOrient.quaternionRef.current;
                  const worldPos = camPos.clone().applyQuaternion(phoneQuat);
                  const worldQuat = phoneQuat.clone().multiply(camQuat);

                  const worldMatrix = new Matrix4();
                  worldMatrix.compose(worldPos, worldQuat, camScale);
                  frameRef.current.anchorMatrix.copy(worldMatrix);
                } else {
                  frameRef.current.anchorMatrix.copy(matrix);
                }
                frameRef.current.anchorVisible = true;
              }
              setTracking(true);
              setPhase('playing');
              // Bloquear anclaje permanente tras el primer escaneo del QR
              useScanStore.getState().lockQr();
            } else {
              // Si la tarjeta QR ya fue escaneada, la animación PERMANECE FIJA en el mundo
              // No desaparece aunque la cámara mire a otro lado ni requiere escanear de nuevo
              const isLocked = useScanStore.getState().isQrLocked;
              if (!isLocked) {
                if (frameRef.current) {
                  frameRef.current.anchorVisible = false;
                }
                setTracking(false);
              }
            }
          }

          animFrameId = requestAnimationFrame(scanLoop);
        };

        animFrameId = requestAnimationFrame(scanLoop);
      }
    };

    run().catch(() => {
      if (!cancelled) fail('target-load-error');
    });

    return () => {
      cancelled = true;
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      teardown();
    };
  }, [
    session,
    project,
    scanMode,
    teardown,
    fail,
    setPhase,
    setTracking,
    setDetectedQrPayload,
    updateLayout,
    frameRef,
  ]);

  // Listener para Resize y Orientación
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
