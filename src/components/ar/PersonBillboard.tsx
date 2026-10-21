import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide, Mesh, ShaderMaterial, SRGBColorSpace, VideoTexture } from 'three';
import type { RefObject } from 'react';
import { useScanStore } from '../../store/useScanStore';
import type { Project } from '../../types/project';
import type { ARFrameState } from '../../types/scan';

interface PersonBillboardProps {
  frameRef: RefObject<ARFrameState | null>;
  project: Project;
}

interface PersonVideo {
  texture: VideoTexture | null;
  aspect: number;
}

/**
 * Crea el <video> del proyecto (blob) y su VideoTexture, y lo gobierna:
 * - mute sincronizado con el overlay;
 * - «Reiniciar» → rebobinar y reproducir;
 * - `ended` (vídeo sin bucle) → store.videoEnded;
 * - pausa/reanuda con la visibilidad del target sin rebobinar (RF-02).
 * Se libera al cambiar de proyecto o al desmontar (RF-06).
 */
function usePersonVideo(
  project: Project,
  frameRef: RefObject<ARFrameState | null>,
  muted: boolean,
  restartSignal: number,
  setVideoEnded: (ended: boolean) => void,
  setVideoElement: (el: HTMLVideoElement | null) => void,
): PersonVideo {
  const [texture, setTexture] = useState<VideoTexture | null>(null);
  const [aspect, setAspect] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mutedRef = useRef(muted);
  const visibleRef = useRef(false);
  const lastRestartRef = useRef(restartSignal);

  // Creación y destrucción del vídeo (una sola instancia por proyecto)
  useEffect(() => {
    const url = URL.createObjectURL(project.videoBlob);
    const video = document.createElement('video');
    video.src = url;
    video.loop = project.loop;
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = mutedRef.current;
    videoRef.current = video;
    setVideoElement(video);

    const videoTexture = new VideoTexture(video);
    videoTexture.colorSpace = SRGBColorSpace;

    const onReady = () => setTexture(videoTexture);
    const onMeta = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setAspect(video.videoHeight / video.videoWidth);
      }
    };
    const onEnded = () => setVideoEnded(true);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('ended', onEnded);
    video.load();

    return () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('ended', onEnded);
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      videoTexture.dispose();
      videoRef.current = null;
      setVideoElement(null);
      setTexture(null);
    };
  }, [project, setVideoEnded, setVideoElement]);

  // Mute en cualquier momento (y valor inicial del nuevo vídeo)
  useEffect(() => {
    mutedRef.current = muted;
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  // «Reiniciar»: señal incremental del store
  useEffect(() => {
    if (lastRestartRef.current === restartSignal) return;
    lastRestartRef.current = restartSignal;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setVideoEnded(false);
    void video.play().catch(() => {});
  }, [restartSignal, setVideoEnded]);

  // Pausar/reanudar según la visibilidad del target, sin rebobinar
  useFrame(() => {
    const video = videoRef.current;
    if (!video) return;
    const visible = frameRef.current?.anchorVisible ?? false;
    if (visible === visibleRef.current) return;
    visibleRef.current = visible;

    if (visible) {
      // play() sobre un vídeo terminado lo reiniciaría sin «Reiniciar»
      if (!video.ended) void video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  return { texture, aspect };
}

/**
 * Vídeo de la persona anclado a la tarjeta (RF-02): plano del ancho de la tarjeta
 * (1 unidad MindAR) con alto según el aspecto del vídeo.
 */
export function PersonBillboard({ frameRef, project }: PersonBillboardProps) {
  const muted = useScanStore((s) => s.muted);
  const restartSignal = useScanStore((s) => s.restartSignal);
  const setVideoEnded = useScanStore((s) => s.setVideoEnded);
  const setVideoElement = useScanStore((s) => s.setVideoElement);

  const { texture, aspect } = usePersonVideo(
    project,
    frameRef,
    muted,
    restartSignal,
    setVideoEnded,
    setVideoElement,
  );

  // Shader para eliminar el fondo verde/oscuro y dejar visible la cámara real
  const chromaMaterial = useMemo(() => {
    if (!texture || project.hasAlpha) return null;

    const hex = project.chromaColor || '#00ff00';
    const keyCol = new Color(hex);
    const isGreen = keyCol.g > keyCol.r && keyCol.g > keyCol.b;

    return new ShaderMaterial({
      uniforms: {
        map: { value: texture },
        keyColor: { value: keyCol },
        similarity: { value: isGreen ? 0.38 : 0.26 },
        smoothness: { value: 0.08 },
        isGreenKey: { value: isGreen },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 keyColor;
        uniform float similarity;
        uniform float smoothness;
        uniform bool isGreenKey;
        varying vec2 vUv;

        void main() {
          vec4 tex = texture2D(map, vUv);
          
          // 1. Distancia al color clave seleccionado (ej. verde #00ff00 o chromaColor)
          float dist = distance(tex.rgb, keyColor);
          float alpha = smoothstep(similarity - smoothness, similarity + smoothness, dist);
          
          // 2. Soporte para fondo azul/gris oscuro del demo previo (#0f172a = rgb(0.0588, 0.0902, 0.1647))
          vec3 slateKey = vec3(0.0588, 0.0902, 0.1647);
          float distSlate = distance(tex.rgb, slateKey);
          float alphaSlate = smoothstep(0.18, 0.28, distSlate);
          
          alpha = min(alpha, alphaSlate);
          
          // Descartar completamente si es transparente para no tapar la cámara
          if (alpha < 0.03) {
            discard;
          }
          
          vec3 color = tex.rgb;
          // Supresión de reflejos verdes en los bordes
          if (isGreenKey) {
            color.g = min(color.g, max(color.r, color.b) * 1.05);
          }
          
          gl_FragColor = vec4(color, tex.a * alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
  }, [project.hasAlpha, project.chromaColor, texture]);


  // Limpiar material al desmontar
  useEffect(() => {
    return () => {
      chromaMaterial?.dispose();
    };
  }, [chromaMaterial]);

  const meshRef = useRef<Mesh>(null);

  if (!texture) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0.001]}>
      <planeGeometry args={[1, aspect]} />
      {chromaMaterial ? (
        <primitive object={chromaMaterial} attach="material" />
      ) : (
        <meshBasicMaterial map={texture} transparent side={DoubleSide} toneMapped={false} />
      )}
    </mesh>
  );
}
