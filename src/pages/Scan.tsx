import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ARScene } from '../components/ar/ARScene';
import { CameraView } from '../components/scan/CameraView';
import { ScanOverlay } from '../components/scan/ScanOverlay';
import { ScanStateHandler } from '../components/scan/ScanStateHandler';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { useProject, useProjectList } from '../hooks/useIndexedDB';
import { useScanStore } from '../store/useScanStore';
import { createARFrameState } from '../types/scan';

/**
 * Escáner AR: cámara a pantalla completa + capa 3D + overlay de control.
 * Modos:
 * 1. Demo (Superficie Plana): retícula en pantalla para colocar la animación en mesa/suelo con botón de fijar.
 * 2. Tarjeta con QR: solo al escanear el QR físico de la tarjeta impresa aparece la animación 3D fija en el mundo.
 */
export default function Scan() {
  const frameRef = useRef(createARFrameState());
  const state = useScanStore((s) => s.state);
  const scanMode = useScanStore((s) => s.scanMode);
  const setScanMode = useScanStore((s) => s.setScanMode);
  const selectedId = useScanStore((s) => s.selectedProjectId);
  const setSelectedProject = useScanStore((s) => s.setSelectedProject);
  const setMuted = useScanStore((s) => s.setMuted);

  const orientation = useDeviceOrientation(state !== 'idle' && state !== 'error');

  const { projects, state: listState } = useProjectList();
  const { project, state: projectState } = useProject(selectedId);
  const [searchParams] = useSearchParams();

  // Preselección de proyecto y modo desde URL (?project=<id>&mode=surface|qr o ?demo=1)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || listState !== 'ready') return;
    initializedRef.current = true;

    const modeParam = searchParams.get('mode');
    const isDemoParam = searchParams.get('demo') === '1';

    if (modeParam === 'surface' || modeParam === 'qr') {
      setScanMode(modeParam);
    } else if (isDemoParam) {
      setScanMode('surface');
    }

    const fromUrl = searchParams.get('project');
    const valid = fromUrl && projects.some((p) => p.id === fromUrl);
    const chosenId = valid ? fromUrl : (projects[0]?.id ?? null);
    setSelectedProject(chosenId);

    // Si es el proyecto demo por defecto y no se especificó modo, usar 'surface'
    const chosenProject = projects.find((p) => p.id === chosenId);
    if (!modeParam && (chosenProject?.name?.includes('Demo') || isDemoParam)) {
      setScanMode('surface');
    }
  }, [listState, projects, searchParams, setSelectedProject, setScanMode]);

  // Sonido inicial según la configuración del proyecto
  useEffect(() => {
    if (project) setMuted(project.muted);
  }, [project, setMuted]);

  const selectedExists = projects.some((p) => p.id === selectedId);
  const canStart = selectedExists && projectState === 'ready' && project !== null;

  // Visibilidad de la capa Three.js:
  // - En superficie: visible durante el escaneo para ver la retícula 3D sobre la mesa/suelo
  // - En QR: visible solo cuando el QR es detectado en la tarjeta
  const sceneVisible =
    scanMode === 'surface'
      ? state === 'scanning' || state === 'detected' || state === 'playing'
      : state === 'detected' || state === 'playing';

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      <CameraView frameRef={frameRef} project={project} orientation={orientation} />

      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: sceneVisible ? 1 : 0 }}
        aria-hidden={!sceneVisible}
      >
        <ARScene frameRef={frameRef} project={project} orientation={orientation} />
      </div>

      <ScanStateHandler />
      <ScanOverlay
        projects={projects}
        selectedId={selectedExists ? selectedId : null}
        onSelect={setSelectedProject}
        canStart={canStart}
        project={project}
        orientation={orientation}
      />
    </main>
  );
}
