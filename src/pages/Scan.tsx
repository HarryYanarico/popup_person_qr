import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ARScene } from '../components/ar/ARScene';
import { CameraView } from '../components/scan/CameraView';
import { ScanOverlay } from '../components/scan/ScanOverlay';
import { ScanStateHandler } from '../components/scan/ScanStateHandler';
import { useProject, useProjectList } from '../hooks/useIndexedDB';
import { useScanStore } from '../store/useScanStore';
import { createARFrameState } from '../types/scan';

/**
 * Escáner AR (RF-01/RF-02): cámara a pantalla completa + capa 3D + overlay de estados.
 * Capas (de atrás a delante): vídeo de cámara → escena 3D (persona) → overlay.
 */
export default function Scan() {
  const frameRef = useRef(createARFrameState());
  const state = useScanStore((s) => s.state);
  const selectedId = useScanStore((s) => s.selectedProjectId);
  const setSelectedProject = useScanStore((s) => s.setSelectedProject);
  const setMuted = useScanStore((s) => s.setMuted);

  const { projects, state: listState } = useProjectList();
  const { project, state: projectState } = useProject(selectedId);
  const [searchParams] = useSearchParams();

  // Preselección: ?project=<id> desde Home/tarjeta; si no, el más reciente
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || listState !== 'ready') return;
    initializedRef.current = true;
    const fromUrl = searchParams.get('project');
    const valid = fromUrl && projects.some((p) => p.id === fromUrl);
    setSelectedProject(valid ? fromUrl : (projects[0]?.id ?? null));
  }, [listState, projects, searchParams, setSelectedProject]);

  // Sonido inicial según la configuración del proyecto
  useEffect(() => {
    if (project) setMuted(project.muted);
  }, [project, setMuted]);

  const selectedExists = projects.some((p) => p.id === selectedId);
  const canStart = selectedExists && projectState === 'ready' && project !== null;

  // Fade-in de la escena 3D al detectar el target (RF-07)
  const sceneVisible = state === 'detected' || state === 'playing';

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      <CameraView frameRef={frameRef} project={project} />

      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: sceneVisible ? 1 : 0 }}
        aria-hidden={!sceneVisible}
      >
        <ARScene frameRef={frameRef} project={project} />
      </div>

      <ScanStateHandler />
      <ScanOverlay
        projects={projects}
        selectedId={selectedExists ? selectedId : null}
        onSelect={setSelectedProject}
        canStart={canStart}
        project={project}
      />
    </main>
  );
}
