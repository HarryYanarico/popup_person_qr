import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { saveProject } from '../db/indexedDB';
import type { Project, TimelineMessage } from '../types/project';

// Borrador de subida en memoria mientras el usuario rellena el formulario (/upload).
// Al guardar se convierte en un Project completo persistido en IndexedDB.
export interface UploadDraft {
  name: string;
  videoBlob: Blob | null;
  videoMimeType: string;
  videoFileName: string;
  targetMindBlob: Blob | null;
  targetMindFileName: string;
  targetImageBlob: Blob | null;
  targetImageFileName: string;
  targetPhysicalWidthCm: number | null;
  loop: boolean;
  muted: boolean;
  messages: TimelineMessage[];
}

const emptyDraft = (): UploadDraft => ({
  name: '',
  videoBlob: null,
  videoMimeType: '',
  videoFileName: '',
  targetMindBlob: null,
  targetMindFileName: '',
  targetImageBlob: null,
  targetImageFileName: '',
  targetPhysicalWidthCm: null,
  loop: true,
  muted: false,
  messages: [],
});

interface ProjectStore {
  draft: UploadDraft;
  setDraft: (patch: Partial<UploadDraft>) => void;
  resetDraft: () => void;
  addMessage: (message: Omit<TimelineMessage, 'id'>) => void;
  updateMessage: (id: string, patch: Partial<Omit<TimelineMessage, 'id'>>) => void;
  removeMessage: (id: string) => void;
  /** Guarda el borrador como proyecto nuevo y devuelve su id. */
  commitDraft: () => Promise<string>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  draft: emptyDraft(),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  resetDraft: () => set({ draft: emptyDraft() }),

  addMessage: (message) =>
    set((s) => ({
      draft: {
        ...s.draft,
        messages: [
          ...s.draft.messages,
          { ...message, id: nanoid() },
        ].sort((a, b) => a.timestamp - b.timestamp),
      },
    })),

  updateMessage: (id, patch) =>
    set((s) => ({
      draft: {
        ...s.draft,
        messages: s.draft.messages
          .map((m) => (m.id === id ? { ...m, ...patch } : m))
          .sort((a, b) => a.timestamp - b.timestamp),
      },
    })),

  removeMessage: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        messages: s.draft.messages.filter((m) => m.id !== id),
      },
    })),

  commitDraft: async () => {
    const d = get().draft;
    if (!d.videoBlob || !d.targetImageBlob) {
      throw new Error('draft-incomplete');
    }
    if (!d.targetPhysicalWidthCm) {
      throw new Error('draft-incomplete');
    }
    const now = Date.now();
    const project: Project = {
      id: nanoid(),
      name: d.name.trim(),
      createdAt: now,
      updatedAt: now,
      videoBlob: d.videoBlob,
      videoMimeType: d.videoMimeType || d.videoBlob.type,
      hasAlpha: false, // Sprint 4: detección/pre-procesado de chroma key
      targetImageBlob: d.targetImageBlob,
      targetMindBlob: d.targetMindBlob,
      targetName: d.targetMindFileName,
      targetPhysicalWidthCm: d.targetPhysicalWidthCm,
      messages: d.messages,
      loop: d.loop,
      muted: d.muted,
    };
    await saveProject(project);
    get().resetDraft();
    return project.id;
  },
}));
