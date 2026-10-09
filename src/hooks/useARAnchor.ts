import { useCallback, useRef } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { RefObject } from 'react';
import type { ARFrameState } from '../types/scan';
import type { MindARUpdateMatrix } from 'mind-ar/dist/mindar-image.prod.js';

/**
 * Lógica del ancla AR (lado MindAR):
 * - `setup(dimensions)`: construye la post-matriz de cada target (convierte las coordenadas
 *   del target a unidades donde 1 = ancho de la tarjeta, centrado en el origen — misma
 *   convención que los ejemplos oficiales de MindAR).
 * - `onUpdate`: recibe las matrices del Controller y escribe el resultado en el frameRef
 *   mutable que ARScene leerá en el siguiente render (sin re-renders de React).
 */
export function useARAnchor(frameRef: RefObject<ARFrameState | null>) {
  const postMatrixsRef = useRef<Matrix4[]>([]);

  const setup = useCallback((dimensions: number[][]) => {
    // Se preserva el orden: el índice debe coincidir con targetIndex del Controller
    postMatrixsRef.current = dimensions.map((size) => {
      const markerWidth = size[0];
      const markerHeight = size[1];
      const postMatrix = new Matrix4();
      if (markerWidth === undefined || markerHeight === undefined) return postMatrix;

      const position = new Vector3(
        markerWidth / 2,
        markerWidth / 2 + (markerHeight - markerWidth) / 2,
        0,
      );
      const scale = new Vector3(markerWidth, markerWidth, markerWidth);
      postMatrix.compose(position, new Quaternion(), scale);
      return postMatrix;
    });
  }, []);

  const onUpdate = useCallback(
    (data: Partial<MindARUpdateMatrix>) => {
      if (data.type !== 'updateMatrix') return;
      const frame = frameRef.current;
      if (!frame) return;

      const { targetIndex, worldMatrix } = data;
      if (targetIndex === undefined) return;

      if (worldMatrix === null || worldMatrix === undefined) {
        // Target perdido: ocultar el ancla (RF-02). El vídeo se pausará en Sprint 2+.
        frame.anchorVisible = false;
        return;
      }

      const postMatrix = postMatrixsRef.current[targetIndex];
      if (!postMatrix) return;

      const matrix = new Matrix4().fromArray(worldMatrix);
      matrix.multiply(postMatrix);

      frame.anchorMatrix.copy(matrix);
      frame.anchorVisible = true;
    },
    [frameRef],
  );

  return { setup, onUpdate };
}
