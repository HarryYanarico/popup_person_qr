import { useEffect, useMemo, useState } from 'react';
import es from '../../locales/es.json';
import { useProjectStore } from '../../store/useProjectStore';

const WARN_BYTES = 200 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoUploader() {
  const draft = useProjectStore((s) => s.draft);
  const setDraft = useProjectStore((s) => s.setDraft);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const previewUrl = useMemo(
    () => (draft.videoBlob ? URL.createObjectURL(draft.videoBlob) : null),
    [draft.videoBlob],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onFile = (file: File | undefined) => {
    setError(null);
    setWarning(null);
    if (!file) return;

    const isVideoMime = file.type.startsWith('video/');
    const extensionOk = /\.(webm|mp4|ogg|ogv)$/i.test(file.name);
    if (!isVideoMime && !extensionOk) {
      setError(es.upload.videoUnsupported);
      return;
    }

    const probe = document.createElement('video');
    const supported = file.type === '' || probe.canPlayType(file.type) !== '';
    if (!supported) {
      setError(es.upload.videoUnsupported);
      return;
    }

    if (file.size > WARN_BYTES) {
      setWarning(es.upload.videoTooBig);
    }

    setInfo(
      es.upload.videoInfo
        .replace('{size}', formatBytes(file.size))
        .replace('{duration}', '…'),
    );

    setDraft({
      videoBlob: file,
      videoMimeType: file.type || 'video/webm',
      videoFileName: file.name,
    });
  };

  const handleUseSample = async () => {
    try {
      setLoadingSample(true);
      setError(null);
      const res = await fetch('/targets/demo-person.webm');
      if (!res.ok) throw new Error('No se pudo descargar el video demo.');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'demo-avatar.webm', { type: 'video/webm' });
      onFile(sampleFile);
    } catch {
      setError('Error al cargar el vídeo de prueba.');
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{es.upload.videoTitle}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{es.upload.videoLabel}</p>
        </div>

        <button
          type="button"
          onClick={handleUseSample}
          disabled={loadingSample}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20 active:scale-95 disabled:opacity-50"
        >
          {loadingSample ? 'Cargando…' : es.upload.useSampleVideo}
        </button>
      </header>

      <div className="mt-4">
        <input
          id="video-input"
          type="file"
          accept="video/webm,video/mp4,video/ogg,.webm,.mp4,.ogg"
          className="block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {warning ? <p className="mt-2 text-sm text-amber-400">{warning}</p> : null}

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-black/60 shadow-inner">
          <video
            key={previewUrl}
            src={previewUrl}
            muted
            playsInline
            controls
            className="aspect-video w-full object-contain"
            onLoadedMetadata={(e) => {
              const duration = e.currentTarget.duration;
              if (Number.isFinite(duration)) {
                setInfo(
                  es.upload.videoInfo
                    .replace('{size}', formatBytes(draft.videoBlob?.size ?? 0))
                    .replace('{duration}', formatDuration(duration)),
                );
              }
            }}
          />
          <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-2">
            <span className="text-xs text-emerald-400">
              ✓ {draft.videoFileName}
            </span>
            {info ? <span className="text-xs text-zinc-400">{info}</span> : null}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
          Ningún vídeo seleccionado aún. Sube un archivo o pulsa en «Usar vídeo de prueba».
        </div>
      )}
    </section>
  );
}
