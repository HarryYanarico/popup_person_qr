import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import es from '../locales/es.json';
import { Button } from '../components/ui/Button';
import { VideoUploader } from '../components/upload/VideoUploader';
import { TargetUploader } from '../components/upload/TargetUploader';
import { TimelineEditor } from '../components/upload/TimelineEditor';
import { useProjectStore } from '../store/useProjectStore';

const inputClass =
  'mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none';

// Formulario de subida: vídeo + target + configuración → IndexedDB (RF-06).
export default function Upload() {
  const draft = useProjectStore((s) => s.draft);
  const setDraft = useProjectStore((s) => s.setDraft);
  const commitDraft = useProjectStore((s) => s.commitDraft);
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const width = draft.targetPhysicalWidthCm;
  const widthValid = width !== null && width >= 1 && width <= 200;
  const canSave =
    draft.name.trim() !== '' &&
    draft.videoBlob !== null &&
    draft.targetMindBlob !== null &&
    draft.targetImageBlob !== null &&
    widthValid;

  const onSave = async () => {
    setFormError(null);
    if (!canSave) {
      setFormError(
        !draft.name.trim()
          ? es.upload.nameRequired
          : !widthValid
            ? es.upload.widthRequired
            : !draft.videoBlob
              ? es.upload.videoRequired
              : !draft.targetMindBlob
                ? es.upload.targetMindRequired
                : es.upload.targetImageRequired,
      );
      return;
    }
    setSaving(true);
    try {
      const id = await commitDraft();
      navigate(`/project/${id}`);
    } catch {
      setFormError(es.scan.errors['asset-missing']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-50">{es.upload.title}</h1>
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {es.detail.back}
        </Link>
      </header>

      <VideoUploader />
      <TargetUploader />
      <TimelineEditor />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">{es.upload.formTitle}</h2>

        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-300" htmlFor="project-name">
            {es.upload.nameLabel}
          </label>
          <input
            id="project-name"
            type="text"
            value={draft.name}
            placeholder={es.upload.namePlaceholder}
            maxLength={80}
            className={inputClass}
            onChange={(e) => setDraft({ name: e.target.value })}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-300" htmlFor="card-width">
            {es.upload.widthLabel}
          </label>
          <input
            id="card-width"
            type="number"
            min={1}
            max={200}
            step={0.1}
            inputMode="decimal"
            value={width ?? ''}
            placeholder="10"
            className={inputClass}
            onChange={(e) =>
              setDraft({ targetPhysicalWidthCm: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
          <p className="mt-1 text-xs text-zinc-500">{es.upload.widthHint}</p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draft.loop}
              className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 accent-indigo-500"
              onChange={(e) => setDraft({ loop: e.target.checked })}
            />
            {es.upload.loopLabel}
          </label>
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draft.muted}
              className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 accent-indigo-500"
              onChange={(e) => setDraft({ muted: e.target.checked })}
            />
            {es.upload.mutedLabel}
          </label>
        </div>

        {formError ? (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {formError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button onClick={onSave} disabled={!canSave || saving}>
            {saving ? es.upload.saving : es.upload.save}
          </Button>
        </div>
      </section>
    </main>
  );
}
