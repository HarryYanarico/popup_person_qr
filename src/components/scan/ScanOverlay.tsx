import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Vector3 } from 'three';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { PopupMessage } from '../ui/PopupMessage';
import { QRCardModal } from '../project/QRCardModal';
import es from '../../locales/es.json';
import { useScanStore } from '../../store/useScanStore';
import { useVideoTimeline } from '../../hooks/useVideoTimeline';
import { requestDeviceOrientationPermission, type DeviceOrientationState } from '../../hooks/useDeviceOrientation';
import type { ScanError, ScanMode } from '../../types/scan';
import type { Project } from '../../types/project';

// Mensajes de error centralizados (RF-08)
function errorMessage(error: ScanError): string {
  return es.scan.errors[error] || 'Error en el escáner.';
}

/** Marco animado para el escaneo de tarjeta QR física */
function QRScanFrame({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
      <div className="relative flex h-64 w-64 items-center justify-center rounded-3xl border-2 border-indigo-400/80 bg-indigo-950/10 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
        {/* Esquinas decorativas de escáner */}
        <div className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-indigo-400" />
        <div className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-indigo-400" />
        <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-indigo-400" />
        <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-indigo-400" />

        {/* Línea láser de escaneo animada */}
        <div className="absolute inset-x-2 top-0 h-0.5 animate-[bounce_2.5s_infinite] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]" />

        <div className="text-center p-4">
          <span className="text-2xl">🎴</span>
          <p className="mt-2 text-xs font-semibold text-zinc-200">
            {es.scan.state.scanning}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenModal();
        }}
        className="pointer-events-auto mt-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-zinc-900/80 px-4 py-2 text-xs font-medium text-indigo-300 shadow-lg backdrop-blur-md hover:bg-zinc-800"
      >
        🖨️ Ver / Imprimir código QR de esta tarjeta ↗
      </button>
    </div>
  );
}

interface ScanOverlayProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  canStart: boolean;
  project?: Project | null;
  orientation?: DeviceOrientationState;
}

export function ScanOverlay({ projects, selectedId, onSelect, canStart, project, orientation }: ScanOverlayProps) {
  const state = useScanStore((s) => s.state);
  const error = useScanStore((s) => s.error);
  const scanMode = useScanStore((s) => s.scanMode);
  const setScanMode = useScanStore((s) => s.setScanMode);
  const isSurfaceFixed = useScanStore((s) => s.isSurfaceFixed);
  const fixSurface = useScanStore((s) => s.fixSurface);
  const unfixSurface = useScanStore((s) => s.unfixSurface);
  const surfaceScale = useScanStore((s) => s.surfaceScale);
  const setSurfaceScale = useScanStore((s) => s.setSurfaceScale);
  const start = useScanStore((s) => s.start);
  const stop = useScanStore((s) => s.stop);
  const videoEnded = useScanStore((s) => s.videoEnded);
  const videoElement = useScanStore((s) => s.videoElement);
  const muted = useScanStore((s) => s.muted);
  const toggleMute = useScanStore((s) => s.toggleMute);
  const requestRestart = useScanStore((s) => s.requestRestart);
  const isQrLocked = useScanStore((s) => s.isQrLocked);
  const rescanQr = useScanStore((s) => s.rescanQr);

  const [modalOpen, setModalOpen] = useState(false);
  const { activeMessages } = useVideoTimeline(project?.messages ?? [], videoElement);

  const showCover =
    state === 'idle' ||
    state === 'error' ||
    state === 'requesting-permission' ||
    state === 'loading-assets';

  const isRunning = state !== 'idle' && state !== 'error';
  const noProjects = projects.length === 0;

  const handleModeChange = async (newMode: ScanMode) => {
    if (newMode === 'surface') {
      await requestDeviceOrientationPermission();
    }
    setScanMode(newMode);
  };

  const handleStart = async () => {
    if (scanMode === 'surface') {
      await requestDeviceOrientationPermission();
    }
    start();
  };

  const handleFixSurface = async () => {
    await requestDeviceOrientationPermission();
    if (orientation?.isActive && orientation.quaternionRef.current) {
      // Proyectar el rayo de visión de la cámara hacia el plano horizontal de la mesa (Y = -0.75m)
      const forward = new Vector3(0, 0, -1).applyQuaternion(orientation.quaternionRef.current);
      let dist = forward.y < -0.05 ? -0.75 / forward.y : 1.8;
      dist = Math.max(0.6, Math.min(dist, 4.0));
      const targetPos: [number, number, number] = [
        Number((forward.x * dist).toFixed(3)),
        -0.75,
        Number((forward.z * dist).toFixed(3)),
      ];
      fixSurface(targetPos);
    } else {
      fixSurface();
    }
  };

  const handleUnfixSurface = () => {
    unfixSurface();
    orientation?.recenter();
  };

  const handleRescanQr = () => {
    rescanQr();
    orientation?.recenter();
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
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
                <div className="text-center">
                  <h2 className="text-xl font-bold text-zinc-100">Escáner de Realidad Aumentada</h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    {es.scan.state.idle}
                  </p>
                </div>

                {/* Selector de modo antes de iniciar */}
                <div className="pointer-events-auto flex w-full rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                  <button
                    type="button"
                    onClick={() => handleModeChange('surface')}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                      scanMode === 'surface'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    🌐 Superficie Plana (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('qr')}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                      scanMode === 'qr'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    🎴 Tarjeta con QR
                  </button>
                </div>

                <div className="w-full text-left">
                  <label htmlFor="project-select" className="text-xs text-zinc-400">
                    {es.scan.project.label}
                  </label>
                  <select
                    id="project-select"
                    value={selectedId ?? ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="pointer-events-auto mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button onClick={handleStart} disabled={!canStart} className="pointer-events-auto w-full">
                  {es.scan.action.activateCamera}
                </Button>

                {project && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setModalOpen(true);
                    }}
                    className="pointer-events-auto text-xs text-indigo-400 hover:underline"
                  >
                    📥 Descargar o imprimir tarjeta con código QR
                  </button>
                )}
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
              <Button onClick={handleStart} disabled={!canStart}>
                {es.scan.action.activateCamera}
              </Button>
              <Button variant="ghost" onClick={stop}>
                {es.scan.action.exit}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Barra superior de control durante la sesión de cámara */}
      {isRunning && (
        <header className="pointer-events-auto absolute left-0 right-0 top-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={stop}>
              {es.scan.action.exit}
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleMute}>
              {muted ? '🔇' : '🔊'}
            </Button>
          </div>

          {/* Selector de modo rápido en caliente */}
          <div className="flex rounded-full border border-zinc-700/80 bg-zinc-900/80 p-0.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleModeChange('surface')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                scanMode === 'surface'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🌐 Demo (Superficie)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('qr')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                scanMode === 'qr'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🎴 Tarjeta QR
            </button>
          </div>

          {project && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setModalOpen(true);
              }}
              className="rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-indigo-300 backdrop-blur-md hover:bg-zinc-800"
            >
              🖨️ QR
            </button>
          )}
        </header>
      )}

      {/* MODO SUPERFICIE (DEMO): Botón para fijar / cambiar superficie */}
      {isRunning && scanMode === 'surface' && (
        <div className="pointer-events-auto absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 px-4">
          {!isSurfaceFixed ? (
            <div className="flex flex-col items-center gap-2">
              <span className="rounded-full bg-zinc-900/90 px-4 py-1.5 text-xs font-medium text-indigo-300 shadow-lg backdrop-blur-md border border-indigo-500/40 animate-pulse">
                🎯 Rejilla 3D detectada en la mesa / suelo
              </span>
              <button
                type="button"
                onClick={handleFixSurface}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-2xl shadow-indigo-500/50 transition-all hover:scale-105 active:scale-95"
              >
                📌 Fijar en esta superficie
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-950/80 p-2 shadow-2xl backdrop-blur-md">
              <span className="px-3 text-xs font-medium text-emerald-400">
                ✓ Fijado en la superficie
              </span>
              <Button variant="secondary" size="sm" onClick={handleUnfixSurface}>
                🔄 Cambiar superficie
              </Button>
              <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
                <button
                  type="button"
                  onClick={() => setSurfaceScale(Math.max(0.6, surfaceScale - 0.2))}
                  className="h-7 w-7 rounded bg-zinc-800 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                >
                  −
                </button>
                <span className="px-1 text-[11px] text-zinc-400">
                  {Math.round(surfaceScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSurfaceScale(Math.min(2.5, surfaceScale + 0.2))}
                  className="h-7 w-7 rounded bg-zinc-800 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODO TARJETA QR: Escaneo una sola vez y fijación permanente */}
      {isRunning && scanMode === 'qr' && (
        <>
          {!isQrLocked && <QRScanFrame onOpenModal={() => setModalOpen(true)} />}

          {isQrLocked && (
            <div className="pointer-events-auto absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 px-4">
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-zinc-950/85 p-2 shadow-2xl backdrop-blur-md">
                <span className="px-3 text-xs font-semibold text-emerald-400">
                  ✓ Tarjeta fijada en la superficie
                </span>
                <Button variant="secondary" size="sm" onClick={handleRescanQr}>
                  🔄 Escanear otra tarjeta
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vídeo terminado sin bucle */}
      {isRunning && videoEnded && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 flex w-max -translate-x-1/2 flex-col items-center gap-2">
          <p className="text-xs text-zinc-400">{es.scan.videoEnded}</p>
          <Button size="sm" onClick={requestRestart}>
            {es.scan.action.restart}
          </Button>
        </div>
      )}

      {/* Mensajes emergentes sincronizados con el timeline del vídeo */}
      <AnimatePresence>
        {(state === 'detected' || state === 'playing') &&
          activeMessages.map((msg) => <PopupMessage key={msg.id} message={msg} />)}
      </AnimatePresence>

      {/* Modal para descargar o imprimir la tarjeta QR */}
      {project && (
        <QRCardModal project={project} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
