import { AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { PopupMessage } from '../ui/PopupMessage';
import es from '../../locales/es.json';
import { useScanStore } from '../../store/useScanStore';
import { useVideoTimeline } from '../../hooks/useVideoTimeline';
import type { ScanError } from '../../types/scan';
import type { Project } from '../../types/project';

// Mensajes de error centralizados (RF-08)
function errorMessage(error: ScanError): string {
  return es.scan.errors[error];
}

/** Marco animado que indica "apunta a la tarjeta" (estado scanning/detected). */
function ScanFrame() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-64 w-64 animate-pulse rounded-2xl border-2 border-dashed border-indigo-400/80">
        <span className="absolute -bottom-12 left-1/2 w-max -translate-x-1/2 text-sm text-zinc-200">
          {es.scan.state.scanning}
        </span>
      </div>
    </div>
  );
}

interface ScanOverlayProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** true cuando hay proyecto seleccionado y ya está cargado de IndexedDB */
  canStart: boolean;
  project?: Project | null;
}

/**
 * Overlay de estados del escáner (RF-07) y mensajes emergentes (RF-05).
 * Cada `ScanState` tiene mensaje y acción claros; los mensajes emergentes
 * se muestran con Framer Motion en base a la línea de tiempo del vídeo.
 */
export function ScanOverlay({ projects, selectedId, onSelect, canStart, project }: ScanOverlayProps) {
  const state = useScanStore((s) => s.state);
  const error = useScanStore((s) => s.error);
  const start = useScanStore((s) => s.start);
  const stop = useScanStore((s) => s.stop);
  const videoEnded = useScanStore((s) => s.videoEnded);
  const videoElement = useScanStore((s) => s.videoElement);
  const muted = useScanStore((s) => s.muted);
  const toggleMute = useScanStore((s) => s.toggleMute);
  const requestRestart = useScanStore((s) => s.requestRestart);

  const { activeMessages } = useVideoTimeline(project?.messages ?? [], videoElement);

  const showCover =
    state === 'idle' ||
    state === 'error' ||
    state === 'requesting-permission' ||
    state === 'loading-assets';

  const showScanFrame = state === 'scanning' || state === 'detected';
  const showExit = showScanFrame || state === 'playing';
  const noProjects = projects.length === 0;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Capa de pantalla completa para idle / permiso / carga / error */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-zinc-950/95 transition-opacity duration-500 ${
          showCover ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {state === 'idle' && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 px-6 text-center">
            {noProjects ? (
              <>
                <p className="text-sm text-zinc-400">{es.scan.project.empty}</p>
                <a
                  href="/upload"
                  className="pointer-events-auto rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500"
                >
                  {es.home.upload}
                </a>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-400">{es.scan.state.idle}</p>
                <label htmlFor="project-select" className="text-sm text-zinc-300">
                  {es.scan.project.label}
                </label>
                <select
                  id="project-select"
                  value={selectedId ?? ''}
                  onChange={(e) => onSelect(e.target.value)}
                  className="pointer-events-auto w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Button onClick={start} disabled={!canStart} className="pointer-events-auto">
                  {es.scan.action.activateCamera}
                </Button>
                {!canStart ? (
                  <p className="text-xs text-zinc-500">{es.scan.project.loading}</p>
                ) : null}
                <p className="text-xs text-zinc-500">La cámara solo funciona en HTTPS.</p>
              </>
            )}
          </div>
        )}

        {state === 'requesting-permission' && (
          <Spinner label={es.scan.state['requesting-permission']} />
        )}

        {state === 'loading-assets' && <Spinner label={es.scan.state['loading-assets']} />}

        {state === 'error' && (
          <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
            <p className="text-sm leading-relaxed text-red-400">
              {error ? errorMessage(error) : es.scan.state.error}
            </p>
            <div className="pointer-events-auto flex gap-3">
              <Button onClick={start} disabled={!canStart}>
                {es.scan.action.activateCamera}
              </Button>
              <Button variant="ghost" onClick={stop}>
                {es.scan.action.exit}
              </Button>
            </div>
          </div>
        )}
      </div>

      {showScanFrame && <ScanFrame />}

      {showExit && (
        <div className="pointer-events-auto absolute left-4 top-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={stop}>
            {es.scan.action.exit}
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleMute}>
            {muted ? es.scan.action.unmute : es.scan.action.mute}
          </Button>
        </div>
      )}

      {/* Vídeo sin bucle terminado: ofrecer reproducir de nuevo (RF-02) */}
      {state !== 'idle' && state !== 'error' && videoEnded && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 flex w-max -translate-x-1/2 flex-col items-center gap-2">
          <p className="text-xs text-zinc-400">{es.scan.videoEnded}</p>
          <Button size="sm" onClick={requestRestart}>
            {es.scan.action.restart}
          </Button>
        </div>
      )}

      {/* Mensajes emergentes sincronizados con el timeline del vídeo (RF-05) */}
      <AnimatePresence>
        {(state === 'detected' || state === 'playing') &&
          activeMessages.map((msg) => (
            <PopupMessage key={msg.id} message={msg} />
          ))}
      </AnimatePresence>

      {state === 'playing' && !videoEnded && (
        <p className="absolute bottom-6 left-1/2 w-max -translate-x-1/2 text-xs text-zinc-400/80">
          {es.scan.state.playing}
        </p>
      )}
    </div>
  );
}
