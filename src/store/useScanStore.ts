import { create } from 'zustand';
import type { ScanError, ScanState } from '../types/scan';

interface ScanStore {
  state: ScanState;
  error: ScanError | null;
  isTracking: boolean;
  // Sesión de cámara: 0 = inactiva; cada start() incrementa para que CameraView
  // pueda montar/desmontar con un solo effect estable (evita re-ejecuciones por cambio de fase)
  session: number;
  // Proyecto seleccionado para escanear (?project=<id> lo preselecciona)
  selectedProjectId: string | null;
  // Elemento HTMLVideoElement del vídeo de la persona para sincronizar timeline de mensajes (RF-05)
  videoElement: HTMLVideoElement | null;
  // Estado de reproducción del vídeo de la persona (RF-02 / fin de vídeo sin bucle)
  videoEnded: boolean;
  muted: boolean;
  // Señal incremental: PedirReiniciar hace que PersonBillboard rebobine y reproduzca
  restartSignal: number;
  start: () => void;
  stop: () => void;
  fail: (error: ScanError) => void;
  setPhase: (state: ScanState) => void;
  setTracking: (isTracking: boolean) => void;
  setSelectedProject: (id: string | null) => void;
  setVideoElement: (videoElement: HTMLVideoElement | null) => void;
  setVideoEnded: (videoEnded: boolean) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  requestRestart: () => void;
}

export const useScanStore = create<ScanStore>((set, get) => ({
  state: 'idle',
  error: null,
  isTracking: false,
  session: 0,
  selectedProjectId: null,
  videoElement: null,
  videoEnded: false,
  muted: true,
  restartSignal: 0,

  // idle/error → requesting-permission
  start: () => {
    if (get().session !== 0) return;
    set({
      state: 'requesting-permission',
      error: null,
      isTracking: false,
      session: get().session + 1,
      videoEnded: false,
    });
  },

  // cualquier estado → idle (detiene cámara y tracking)
  stop: () => {
    set({ state: 'idle', error: null, isTracking: false, session: 0, videoElement: null });
  },

  // cualquier estado → error (detiene la sesión para que CameraView limpie recursos)
  fail: (error) => {
    set({ state: 'error', error, isTracking: false, session: 0, videoElement: null });
  },

  setPhase: (state) => set({ state }),

  setTracking: (isTracking) => set({ isTracking }),

  setSelectedProject: (id) => set({ selectedProjectId: id }),

  setVideoElement: (videoElement) => set({ videoElement }),

  setVideoEnded: (videoEnded) => set({ videoEnded }),

  setMuted: (muted) => set({ muted }),

  toggleMute: () => set((s) => ({ muted: !s.muted })),

  requestRestart: () =>
    set((s) => ({ restartSignal: s.restartSignal + 1, videoEnded: false })),
}));
