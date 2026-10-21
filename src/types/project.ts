// Modelo de datos obligatorio (Prompt MAESTRO v2 — Sprint 0)
// Adaptación cerrada con el usuario:
// - El target NO es solo el QR: el usuario sube la imagen completa de su tarjeta
//   y el archivo .mind ya compilado desde mindarjs.org.
// - MVP: mensajes solo de tipo 'text' (el tipo 'image' queda previsto para Fase 2).

export type MessageType = 'text' | 'image';

export interface TimelineMessage {
  id: string;
  timestamp: number; // segundos desde el inicio del vídeo
  duration: number; // cuánto tiempo se muestra (segundos)
  type: MessageType;
  content: string; // texto (MVP) o dataURL de imagen (Fase 2)
  position: 'top' | 'center' | 'bottom';
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  videoBlob: Blob;
  videoMimeType: string;
  hasAlpha: boolean;
  chromaColor?: string; // ej. '#00FF00' si se aplicó chroma key (pre-procesado al subir)
  // Target de tracking (imagen completa de la tarjeta + .mind compilado externamente)
  targetImageBlob: Blob; // preview de la tarjeta impresa (png/jpg/webp)
  targetMindBlob?: Blob | null; // archivo .mind compilado (opcional si es QR)
  targetName: string; // nombre original del .mind para depurar
  targetPhysicalWidthCm: number; // ancho real de la tarjeta impresa en cm
  messages: TimelineMessage[];
  loop: boolean;
  muted: boolean;
}
