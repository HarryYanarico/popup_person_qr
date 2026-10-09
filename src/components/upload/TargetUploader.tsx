import { useEffect, useMemo, useState } from 'react';
import es from '../../locales/es.json';
import { useProjectStore } from '../../store/useProjectStore';

const MIND_EXTENSIONS = /\.(mind)$/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

// Sube el target de tracking: .mind compilado en mindarjs.org (obligatorio)
// + imagen de la tarjeta impresa (obligatoria como miniatura, decisión cerrada).
export function TargetUploader() {
  const draft = useProjectStore((s) => s.draft);
  const setDraft = useProjectStore((s) => s.setDraft);
  const [mindError, setMindError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Miniatura: objectURL derivada del blob, revocada al cambiar o desmontar
  const previewUrl = useMemo(
    () => (draft.targetImageBlob ? URL.createObjectURL(draft.targetImageBlob) : null),
    [draft.targetImageBlob],
  );
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-semibold text-zinc-100">{es.upload.targetTitle}</h2>

      <label className="mt-4 block text-sm font-medium text-zinc-300" htmlFor="mind-input">
        {es.upload.targetMindLabel}
      </label>
      <p className="mt-1 text-xs text-zinc-500">{es.upload.targetMindHint}</p>
      <input
        id="mind-input"
        type="file"
        accept=".mind"
        className="mt-2 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
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
        <p className="mt-2 break-all text-xs text-zinc-400">✓ {draft.targetMindFileName}</p>
      ) : null}
      {mindError ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {mindError}
        </p>
      ) : null}

      <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="target-image-input">
        {es.upload.targetImageLabel}
      </label>
      <p className="mt-1 text-xs text-zinc-500">{es.upload.targetImageHint}</p>
      <input
        id="target-image-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        className="mt-2 block w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
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
          className="mt-3 max-h-40 rounded-xl border border-zinc-800 object-contain"
        />
      ) : null}
      {imageError ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {imageError}
        </p>
      ) : null}
    </section>
  );
}
