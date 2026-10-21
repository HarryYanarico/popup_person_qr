import { nanoid } from 'nanoid';
import { saveProject } from '../db/indexedDB';
import type { Project } from '../types/project';

/**
 * Carga los archivos de la tarjeta estándar incluida en la app (/targets/card.mind y /targets/card.png)
 * para que el usuario no tenga que compilar nada externamente.
 */
export async function loadStandardTargetFiles() {
  const [mindRes, imgRes] = await Promise.all([
    fetch('/targets/card.mind'),
    fetch('/targets/card.png'),
  ]);

  if (!mindRes.ok || !imgRes.ok) {
    throw new Error('No se pudieron cargar los archivos de la tarjeta estándar.');
  }

  const [targetMindBlob, targetImageBlob] = await Promise.all([
    mindRes.blob(),
    imgRes.blob(),
  ]);

  return {
    targetMindBlob,
    targetMindFileName: 'card.mind',
    targetImageBlob,
    targetImageFileName: 'card.png',
    targetPhysicalWidthCm: 10,
  };
}

/**
 * Crea y guarda un proyecto de demostración listo para escanear en 1 solo clic.
 */
export async function createDemoProject(): Promise<string> {
  const [standardFiles, videoRes] = await Promise.all([
    loadStandardTargetFiles(),
    fetch('/targets/demo-person.webm'),
  ]);

  if (!videoRes.ok) {
    throw new Error('No se pudo cargar el vídeo de demostración.');
  }

  const videoBlob = await videoRes.blob();
  const now = Date.now();

  const demoProject: Project = {
    id: nanoid(),
    name: '🌟 Proyecto Demo (Asistente AR)',
    createdAt: now,
    updatedAt: now,
    videoBlob,
    videoMimeType: 'video/webm',
    hasAlpha: false,
    chromaColor: '#00ff00',
    targetImageBlob: standardFiles.targetImageBlob,
    targetMindBlob: standardFiles.targetMindBlob,
    targetName: standardFiles.targetMindFileName,
    targetPhysicalWidthCm: standardFiles.targetPhysicalWidthCm,
    loop: true,
    muted: false,
    messages: [
      {
        id: nanoid(),
        timestamp: 0.5,
        duration: 3,
        type: 'text',
        content: '👋 ¡Hola! Bienvenido a tu experiencia de realidad aumentada.',
        position: 'top',
      },
      {
        id: nanoid(),
        timestamp: 2.2,
        duration: 3.5,
        type: 'text',
        content: '✨ Mantén la cámara apuntando a la tarjeta para interactuar.',
        position: 'bottom',
      },
    ],
  };

  await saveProject(demoProject);
  return demoProject.id;
}
