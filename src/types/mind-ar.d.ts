// Tipados manuales del runtime de MindAR que usamos en el escáner.
// La librería no publica tipos; declaramos solo lo que consumimos (TS estricto, sin any).
declare module 'mind-ar/dist/mindar-image.prod.js' {
  // Datos que llegan por el callback onUpdate del Controller
  export interface MindARUpdateMatrix {
    type: 'updateMatrix';
    targetIndex: number;
    // Matriz 4x4 en formato columna-fila (16 números) o null si el target se perdió
    worldMatrix: number[] | null;
  }

  export interface MindARControllerOptions {
    inputWidth: number;
    inputHeight: number;
    onUpdate?: (data: { type: string } & Partial<MindARUpdateMatrix>) => void;
    debugMode?: boolean;
    maxTrack?: number;
    warmupTolerance?: number | null;
    missTolerance?: number | null;
    filterMinCF?: number | null;
    filterBeta?: number | null;
  }

  export class Controller {
    constructor(options: MindARControllerOptions);
    inputWidth: number;
    inputHeight: number;
    processingVideo: boolean;
    // Worker interno: lo terminamos en la limpieza para evitar fugas entre sesiones
    worker: Worker;
    addImageTargets(fileURL: string): Promise<{ dimensions: number[][] }>;
    dummyRun(input: HTMLVideoElement): void;
    processVideo(input: HTMLVideoElement): void;
    stopProcessVideo(): void;
    getProjectionMatrix(): number[];
    dispose(): void;
  }
}
