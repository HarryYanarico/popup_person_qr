import { useEffect, useMemo, useState } from 'react';
import es from '../../locales/es.json';
import { useProjectStore } from '../../store/useProjectStore';

const WARN_BYTES = 200 * 1024 * 1024; // RF-06: avisar por encima de 200 MB

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

// Sube el vídeo de la persona: valida formato reproducible, avisa si pesa mucho
// y muestra vista previa con tamaño/duración. Escribe directamente en el borrador.
export function VideoUploader() {
  const draft = useProjectStore((s) => s.draft);
  const setDraft = useProjectStore((s) => s.setDraft);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Vista previa: objectURL derivada del blob, revocada al cambiar o desmontar
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
    // ¿Puede el navegador reproducirlo? (RF-06, ScanError unsupported-codec)
    const probe = document.createElement('video');
    const supported =
      file.type === '' ||
      probe.canPlayType(file.type) !== '';
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
      videoMimeType: file.type,
      videoFileName: file.name,
    });
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-semibold text-zinc-100">{es.upload.videoTitle}</h2>

      <label className="mt-4 block text-sm font-medium text-zinc-300" htmlFor="video-input">
        {es.upload.videoLabel}
      </label>
      <input
        id="video-input"
        type="file"
        accept="video/webm,video/mp4,video/ogg,.webm,.mp4,.ogg"
        className="mt-2 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {warning ? (
        <p className="mt-2 text-sm text-amber-400">{warning}</p>
      ) : null}

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-black/60">
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
        </div>
      ) : null}

      {info ? <p className="mt-2 text-xs text-zinc-500">{info}</p> : null}
    </section>
  );
}
