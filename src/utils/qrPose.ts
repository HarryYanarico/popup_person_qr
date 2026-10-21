import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { QRCode } from 'jsqr';

export interface QRPoseOptions {
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
  fov?: number;
}

export class QRPoseTracker {
  private targetMatrix = new Matrix4();
  private currentPos = new Vector3();
  private targetPos = new Vector3();
  private currentQuat = new Quaternion();
  private targetQuat = new Quaternion();
  private currentScale = new Vector3(1, 1, 1);
  private targetScale = new Vector3(1, 1, 1);
  private hasPreviousPose = false;

  reset() {
    this.hasPreviousPose = false;
  }

  /**
   * Calcula la matriz de transformación 3D a partir de las 4 esquinas del QR detectado por jsQR.
   */
  computeMatrix(code: QRCode, options: QRPoseOptions): Matrix4 {
    const { canvasWidth, canvasHeight, containerWidth, containerHeight, fov = 48 } = options;
    const { topLeftCorner: pTL, topRightCorner: pTR, bottomRightCorner: pBR, bottomLeftCorner: pBL } = code.location;

    // Centro en píxeles del canvas
    const cx = (pTL.x + pTR.x + pBR.x + pBL.x) / 4;
    const cy = (pTL.y + pTR.y + pBR.y + pBL.y) / 4;

    // Coordenadas normalizadas (-1 a 1)
    const ndcX = (cx / canvasWidth) * 2 - 1;
    const ndcY = -((cy / canvasHeight) * 2 - 1);

    // Dimensiones en píxeles de los 4 lados para estimar distancia y perspectiva
    const topEdge = Math.hypot(pTR.x - pTL.x, pTR.y - pTL.y);
    const bottomEdge = Math.hypot(pBR.x - pBL.x, pBR.y - pBL.y);
    const leftEdge = Math.hypot(pBL.x - pTL.x, pBL.y - pTL.y);
    const rightEdge = Math.hypot(pBR.x - pTR.x, pBR.y - pTR.y);

    const avgPixelSize = (topEdge + bottomEdge + leftEdge + rightEdge) / 4;
    const fraction = avgPixelSize / Math.min(canvasWidth, canvasHeight);

    // Distancia Z basada en el tamaño aparente del QR en pantalla
    const halfFovRad = ((fov / 2) * Math.PI) / 180;
    const tanHalfFov = Math.tan(halfFovRad);

    // Calibración para tarjeta de ~8.5-10cm:
    const rawDist = 0.55 / Math.max(0.06, fraction * tanHalfFov * 2.8);
    const dist = Math.max(0.4, Math.min(4.5, rawDist));

    const aspect = containerWidth / containerHeight;
    const worldX = ndcX * tanHalfFov * dist * aspect;
    const worldY = ndcY * tanHalfFov * dist;
    const worldZ = -dist;

    // Orientación planar (giro del QR en pantalla)
    const angleZ = Math.atan2(pTR.y - pTL.y, pTR.x - pTL.x);

    // Inclinación perspectiva (Pitch y Yaw)
    const pitchRatio = (bottomEdge - topEdge) / Math.max(1, avgPixelSize);
    const yawRatio = (rightEdge - leftEdge) / Math.max(1, avgPixelSize);

    const pitch = Math.asin(Math.max(-0.8, Math.min(0.8, pitchRatio * 1.5)));
    const yaw = Math.asin(Math.max(-0.8, Math.min(0.8, yawRatio * 1.5)));

    this.targetPos.set(worldX, worldY, worldZ);

    const euler = new Euler(pitch, yaw, -angleZ, 'YXZ');
    this.targetQuat.setFromEuler(euler);

    // Escala del avatar: proporcional al tamaño del QR
    const cardScale = Math.max(0.8, Math.min(2.2, dist * 0.9));
    this.targetScale.set(cardScale, cardScale, cardScale);

    if (!this.hasPreviousPose) {
      this.currentPos.copy(this.targetPos);
      this.currentQuat.copy(this.targetQuat);
      this.currentScale.copy(this.targetScale);
      this.hasPreviousPose = true;
    } else {
      // Suavizado exponencial (lerp / slerp) para eliminar cualquier temblor de la cámara
      const smoothFactor = 0.38;
      this.currentPos.lerp(this.targetPos, smoothFactor);
      this.currentQuat.slerp(this.targetQuat, smoothFactor);
      this.currentScale.lerp(this.targetScale, smoothFactor);
    }

    this.targetMatrix.compose(this.currentPos, this.currentQuat, this.currentScale);
    return this.targetMatrix;
  }
}
