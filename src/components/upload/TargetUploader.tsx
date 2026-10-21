import { useEffect, useMemo, useRef, useState } from 'react';
import es from '../../locales/es.json';
import { useProjectStore } from '../../store/useProjectStore';
import { loadStandardTargetFiles } from '../../utils/demoProject';
import {
  downloadDataURL,
  generatePrintableCardDataURL,
  generateQRCodeDataURL,
  printCardDataURL,
} from '../../utils/qrGenerator';

const MIND_EXTENSIONS = /\.(mind)$/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

const SIZE_PRESETS = [
  { label: es.upload.sizePresetStandard, value: 8.5 },
  { label: es.upload.sizePresetOfficial, value: 10 },
  { label: es.upload.sizePresetA6, value: 15 },
  { label: es.upload.sizePresetA4, value: 21 },
];

export function TargetUploader() {
  const draft = useProjectStore((s) => s.draft);
  const setDraft = useProjectStore((s) => s.setDraft);

  const [mode, setMode] = useState<'qr' | 'standard' | 'custom'>('qr');
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [qrCardDataUrl, setQrCardDataUrl] = useState<string | null>(null);
  const [qrOnlyDataUrl, setQrOnlyDataUrl] = useState<string | null>(null);
  const [mindError, setMindError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const lastGeneratedKeyRef = useRef<string>('');

  // Generar automáticamente la tarjeta QR al estar en modo 'qr' (evitando bucles de re-render)
  useEffect(() => {
    let active = true;
    if (mode === 'qr') {
      const currentKey = `${(draft.name || '').trim()}_${draft.targetPhysicalWidthCm || 10}`;
      if (lastGeneratedKeyRef.current === currentKey && qrCardDataUrl) {
        return;
      }
      lastGeneratedKeyRef.current = currentKey;

      void (async () => {
        try {
          setLoadingTarget(true);
          const fakeId = 'temp-' + (draft.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'ar');
          const [cardUrl, qrUrl] = await Promise.all([
            generatePrintableCardDataURL({
              projectId: fakeId,
              projectName: draft.name.trim() || 'Mi Tarjeta AR',
              physicalWidthCm: draft.targetPhysicalWidthCm || 10,
            }),
            generateQRCodeDataURL(`arproject:${fakeId}`, 600),
          ]);

          if (!active) return;
          setQrCardDataUrl(cardUrl);
          setQrOnlyDataUrl(qrUrl);

          // Convertir el dataURL a Blob para el store
          const res = await fetch(cardUrl);
          const blob = await res.blob();
          if (!active) return;

          setDraft({
            targetImageBlob: blob,
            targetImageFileName: 'tarjeta-qr.png',
            targetPhysicalWidthCm: draft.targetPhysicalWidthCm ?? 10,
            targetMindBlob: null,
            targetMindFileName: 'qr-mode',
          });
        } catch (e) {
          console.error(e);
        } finally {
          if (active) setLoadingTarget(false);
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [mode, draft.name, draft.targetPhysicalWidthCm, qrCardDataUrl, setDraft]);

  // Cargar tarjeta estándar si se selecciona ese modo
  useEffect(() => {
    let active = true;
    if (mode === 'standard') {
      void (async () => {
        try {
          setLoadingTarget(true);
          const files = await loadStandardTargetFiles();
          if (!active) return;
          setDraft({
            targetMindBlob: files.targetMindBlob,
            targetMindFileName: files.targetMindFileName,
            targetImageBlob: files.targetImageBlob,
            targetImageFileName: files.targetImageFileName,
            targetPhysicalWidthCm: draft.targetPhysicalWidthCm ?? files.targetPhysicalWidthCm,
          });
        } catch {
          if (active) setMindError('No se pudo cargar la tarjeta estándar.');
        } finally {
          if (active) setLoadingTarget(false);
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [mode, draft.targetPhysicalWidthCm, setDraft]);

  const previewUrl = useMemo(
    () => (draft.targetImageBlob ? URL.createObjectURL(draft.targetImageBlob) : null),
    [draft.targetImageBlob],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const currentWidth = draft.targetPhysicalWidthCm ?? 10;
  const isCustomWidth = !SIZE_PRESETS.some((p) => p.value === currentWidth);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100">{es.upload.targetTitle}</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Elige cómo identificar tu tarjeta: mediante código QR generado al instante o subiendo un archivo .mind propio.
        </p>
      </header>

      {/* Selector de 3 modos */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setMode('qr');
            setMindError(null);
            setImageError(null);
          }}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
            mode === 'qr'
              ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
              : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <span className="text-sm font-semibold">✨ Tarjeta QR (Recomendada)</span>
          <span className="mt-1 text-xs text-zinc-400">
            Genera un código QR en PNG listo para imprimir en papel. No necesitas compilar nada.
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('standard');
            setMindError(null);
            setImageError(null);
          }}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
            mode === 'standard'
              ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
              : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <span className="text-sm font-semibold">{es.upload.targetModeStandard}</span>
          <span className="mt-1 text-xs text-zinc-400">
            Usa el patrón gráfico predeterminado para MindAR.
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('custom');
            setDraft({
              targetMindBlob: null,
              targetMindFileName: '',
              targetImageBlob: null,
              targetImageFileName: '',
            });
          }}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
            mode === 'custom'
              ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
              : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <span className="text-sm font-semibold">📁 Archivo .mind propio</span>
          <span className="mt-1 text-xs text-zinc-400">
            Sube el archivo .mind compilado previamente en mindarjs.org.
          </span>
        </button>
      </div>

      {/* Contenido según modo */}
      {mode === 'qr' && (
        <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {loadingTarget ? (
              <div className="h-32 w-32 animate-pulse rounded-lg bg-zinc-800" />
            ) : qrCardDataUrl ? (
              <div className="relative rounded-lg border border-indigo-500/40 bg-white p-2 shadow-md">
                <img
                  src={qrCardDataUrl}
                  alt="Tarjeta QR generada"
                  className="h-28 w-auto object-contain"
                />
              </div>
            ) : null}

            <div className="flex flex-1 flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                ✓ Código QR generado en PNG listo para imprimir
              </span>
              <p className="text-xs text-zinc-300">
                Descarga esta tarjeta en PNG o imprímela. Al apuntar la cámara a este código QR,
                aparecerá la animación automáticamente sobre él.
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (qrCardDataUrl) printCardDataURL(qrCardDataUrl, draft.name || 'Tarjeta AR');
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  🖨️ Imprimir Tarjeta
                </button>
                <button
                  type="button"
                  disabled={downloadingCard}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!qrCardDataUrl || downloadingCard) return;
                    setDownloadingCard(true);
                    downloadDataURL(qrCardDataUrl, 'tarjeta-ar.png');
                    setTimeout(() => setDownloadingCard(false), 1500);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {downloadingCard ? '⏳ Descargando…' : '📥 Descargar Tarjeta (PNG)'}
                </button>
                <button
                  type="button"
                  disabled={downloadingQr}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!qrOnlyDataUrl || downloadingQr) return;
                    setDownloadingQr(true);
                    downloadDataURL(qrOnlyDataUrl, 'codigo-qr.png');
                    setTimeout(() => setDownloadingQr(false), 1500);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
                >
                  {downloadingQr ? '⏳ Descargando…' : '📎 Solo QR (PNG)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'standard' && (
        <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {loadingTarget ? (
              <div className="h-28 w-28 animate-pulse rounded-lg bg-zinc-800" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Tarjeta oficial"
                className="h-28 w-28 rounded-lg border border-indigo-500/30 object-contain shadow"
              />
            ) : null}

            <div className="flex flex-1 flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                {es.upload.targetStandardReady}
              </span>
              <p className="text-xs text-zinc-300">
                Puedes imprimir esta imagen en papel o abrirla en otra pantalla para escanearla.
              </p>
              <a
                href="/targets/card.png"
                target="_blank"
                rel="noreferrer"
                download="tarjeta-ar.png"
                className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                {es.upload.downloadCard} ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <div className="mt-5 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300" htmlFor="mind-input">
              {es.upload.targetMindLabel}
            </label>
            <p className="mt-0.5 text-xs text-zinc-400">
              {es.upload.targetMindHint}{' '}
              <a
                href="https://hiukim.github.io/mind-ar-js-doc/tools/compile"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Compilador oficial MindAR ↗
              </a>
            </p>
            <input
              id="mind-input"
              type="file"
              accept=".mind"
              className="mt-2 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                setMindError(null);
                if (!file) return;
                if (!MIND_EXTENSIONS.test(file.name)) {
                  setMindError(es.upload.targetMindRequired);
                  return;
                }
                setDraft({ targetMindBlob: file, targetMindFileName: file.name });
              }}
            />
            {draft.targetMindFileName ? (
              <p className="mt-1 text-xs text-emerald-400">✓ {draft.targetMindFileName}</p>
            ) : null}
            {mindError ? <p role="alert" className="mt-1 text-xs text-red-400">{mindError}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300" htmlFor="target-image-input">
              {es.upload.targetImageLabel}
            </label>
            <p className="mt-0.5 text-xs text-zinc-400">{es.upload.targetImageHint}</p>
            <input
              id="target-image-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              className="mt-2 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                setImageError(null);
                if (!file) return;
                if (!IMAGE_EXTENSIONS.test(file.name)) {
                  setImageError(es.upload.targetImageRequired);
                  return;
                }
                setDraft({ targetImageBlob: file, targetImageFileName: file.name });
              }}
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={draft.targetImageFileName}
                className="mt-2 max-h-32 rounded-lg border border-zinc-800 object-contain"
              />
            ) : null}
            {imageError ? <p role="alert" className="mt-1 text-xs text-red-400">{imageError}</p> : null}
          </div>
        </div>
      )}

      {/* Selector de tamaño físico con presets */}
      <div className="mt-6 border-t border-zinc-800/80 pt-5">
        <label className="block text-sm font-medium text-zinc-300">
          {es.upload.widthLabel}
        </label>
        <p className="mt-0.5 text-xs text-zinc-400">{es.upload.widthHint}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setDraft({ targetPhysicalWidthCm: preset.value })}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                draft.targetPhysicalWidthCm === preset.value
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <input
            id="card-width"
            type="number"
            min={1}
            max={200}
            step={0.1}
            inputMode="decimal"
            value={currentWidth}
            placeholder="10"
            className="w-28 rounded-xl border border-zinc-700 bg-zinc-950/60 p-2 text-center text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            onChange={(e) =>
              setDraft({ targetPhysicalWidthCm: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
          <span className="text-xs text-zinc-400">
            {isCustomWidth ? 'Tamaño personalizado en centímetros' : 'Centímetros de ancho'}
          </span>
        </div>
      </div>
    </section>
  );
}
