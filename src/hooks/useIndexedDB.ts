import { useCallback, useEffect, useState } from 'react';
import { getProject, listProjects } from '../db/indexedDB';
import type { Project } from '../types/project';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Lista de proyectos ordenada por updatedAt desc, recargable con reload().
 * El estado se deriva en render (nada de setState síncrono dentro de efectos).
 */
export function useProjectList(): {
  projects: Project[];
  state: LoadState;
  reload: () => void;
} {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    version: number;
    projects: Project[];
    error: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((projects) => {
        if (!cancelled) setResult({ version, projects, error: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ version, projects: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const fresh = result !== null && result.version === version;
  const state: LoadState = fresh ? (result.error ? 'error' : 'ready') : 'loading';

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { projects: fresh ? result.projects : [], state, reload };
}

/** Un proyecto por id; se recarga si cambia el id. */
export function useProject(id: string | null | undefined): {
  project: Project | null;
  state: LoadState;
} {
  const [result, setResult] = useState<{
    id: string;
    project: Project | null;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getProject(id)
      .then((found) => {
        if (!cancelled) setResult({ id, project: found ?? null, error: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ id, project: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const fresh = id !== undefined && id !== null && result !== null && result.id === id;
  const state: LoadState = !id ? 'ready' : fresh ? (result.error ? 'error' : 'ready') : 'loading';

  return { project: fresh ? result.project : null, state };
}
