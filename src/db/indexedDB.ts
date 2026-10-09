import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { DBSchema } from 'idb';
import type { Project } from '../types/project';

// Esquema de IndexedDB (RF-06): projects (proyectos completos con sus blobs),
// targets (reservado para .mind compartidos entre proyectos) y settings.
interface AppDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  targets: {
    key: string;
    value: { id: string; name: string; blob: Blob; createdAt: number };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'ar-qr-scanner';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('targets')) {
          db.createObjectStore('targets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

/** Lista todos los proyectos, el más reciente primero. */
export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAll('projects');
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

/** Inserta o actualiza un proyecto (upsert por id). */
export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}
