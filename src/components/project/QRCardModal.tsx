import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import {
  downloadDataURL,
  generatePrintableCardDataURL,
  generateQRCodeDataURL,
  getProjectQRPayload,
  printCardDataURL,
  sanitizeFilename,
} from '../../utils/qrGenerator';
import type { Project } from '../../types/project';

interface QRCardModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCardModal({ project, isOpen, onClose }: QRCardModalProps) {
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [qrOnlyDataUrl, setQrOnlyDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    // Timeout de seguridad de 8s para evitar que quede congelado
    const timeoutId = setTimeout(() => {
      if (active) {
        setLoading(false);
        setError('Tardó demasiado tiempo en generar la tarjeta. Intenta de nuevo.');
      }
    }, 8000);

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = getProjectQRPayload(project.id);
        const [cardUrl, qrUrl] = await Promise.all([
          generatePrintableCardDataURL({
            projectId: project.id,
            projectName: project.name,
            physicalWidthCm: project.targetPhysicalWidthCm || 10,
          }),
          generateQRCodeDataURL(payload, 800),
        ]);

        if (active) {
          setCardDataUrl(cardUrl);
          setQrOnlyDataUrl(qrUrl);
        }
      } catch (err) {
        console.error('Error generando tarjeta QR:', err);
        if (active) {
          setError('No se pudo generar la tarjeta QR.');
        }
      } finally {
        clearTimeout(timeoutId);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleDownloadCard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardDataUrl || downloadingCard) return;
    setDownloadingCard(true);
    const cleanName = sanitizeFilename(project.name);
    downloadDataURL(cardDataUrl, `tarjeta-ar-${cleanName}.png`);
    setTimeout(() => setDownloadingCard(false), 1200);
  };

  const handleDownloadQR = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!qrOnlyDataUrl || downloadingQr) return;
    setDownloadingQr(true);
    const cleanName = sanitizeFilename(project.name);
    downloadDataURL(qrOnlyDataUrl, `qr-${cleanName}.png`);
    setTimeout(() => setDownloadingQr(false), 1200);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardDataUrl) return;
    printCardDataURL(cardDataUrl, project.name);
  };

  const handleOpenImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardDataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(`<title>Tarjeta AR - ${project.name}</title><img src="${cardDataUrl}" style="max-width:100%; height:auto;" />`);
      win.document.close();
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="pointer-events-auto relative flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="pr-4">
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
              <span>🎴</span> Tarjeta QR para Imprimir
            </h3>
            <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-md">{project.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </header>

        {loading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <Spinner label="Generando tarjeta en alta resolución..." />
            <p className="text-xs text-zinc-500">Optimizando código QR para impresión...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-red-400">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : cardDataUrl ? (
          <div className="flex flex-col items-center gap-3.5">
            {/* Vista previa de la tarjeta */}
            <div className="group relative overflow-hidden rounded-xl border border-zinc-700 bg-white p-2 shadow-inner">
              <img
                src={cardDataUrl}
                alt="Vista previa de tarjeta QR"
                className="max-h-52 w-auto object-contain"
              />
            </div>

            <p className="text-center text-xs text-zinc-400 leading-relaxed">
              💡 <strong>En móvil:</strong> Si la descarga automática no inicia, mantén presionada la imagen para guardarla en tus fotos o pulsa <em>Ver imagen</em>.
            </p>

            {/* Botones de acción principales */}
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                variant="primary"
                onClick={handlePrint}
                className="flex items-center justify-center gap-1 text-xs font-semibold"
              >
                🖨️ Imprimir
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownloadCard}
                disabled={downloadingCard}
                className="flex items-center justify-center gap-1 text-xs font-semibold"
              >
                {downloadingCard ? '⏳ Guardando…' : '📥 Descargar'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleOpenImage}
                className="flex items-center justify-center gap-1 text-xs font-semibold"
              >
                👁️ Ver imagen
              </Button>
              <Button
                variant="ghost"
                onClick={handleDownloadQR}
                disabled={downloadingQr}
                className="flex items-center justify-center gap-1 text-xs font-semibold"
              >
                {downloadingQr ? '⏳ Guardando…' : '📎 Solo QR'}
              </Button>
            </div>
          </div>
        ) : null}

        <footer className="border-t border-zinc-800 pt-3 flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </footer>
      </div>
    </div>
  );
}
