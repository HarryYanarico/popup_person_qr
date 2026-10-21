import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import es from '../locales/es.json';
import { Button } from '../components/ui/Button';
import { VideoUploader } from '../components/upload/VideoUploader';
import { TargetUploader } from '../components/upload/TargetUploader';
import { TimelineEditor } from '../components/upload/TimelineEditor';
import { useProjectStore } from '../store/useProjectStore';
import { createDemoProject } from '../utils/demoProject';

const inputClass =
  'mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none';

export default function Upload() {
  const draft = useProjectStore((s) => s.draft);
  const setDraft = useProjectStore((s) => s.setDraft);
  const commitDraft = useProjectStore((s) => s.commitDraft);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const width = draft.targetPhysicalWidthCm;
  const widthValid = width !== null && width >= 1 && width <= 200;

  const isStep1Valid = Boolean(draft.targetImageBlob && widthValid);
  const isStep2Valid = Boolean(draft.videoBlob);
  const canSave = isStep1Valid && isStep2Valid && (draft.name.trim() !== '' || draft.name === '');

  // Preview URLs para el resumen del paso 4
  const targetPreviewUrl = useMemo(
    () => (draft.targetImageBlob ? URL.createObjectURL(draft.targetImageBlob) : null),
    [draft.targetImageBlob],
  );
  useEffect(() => {
    if (!targetPreviewUrl) return;
    return () => URL.revokeObjectURL(targetPreviewUrl);
  }, [targetPreviewUrl]);

  const handleNext = () => {
    setStepError(null);
    if (currentStep === 1) {
      if (!draft.targetImageBlob) {
        setStepError('Genera o sube una tarjeta AR para continuar.');
        return;
      }
      if (!widthValid) {
        setStepError(es.upload.widthRequired);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!draft.videoBlob) {
        setStepError(es.upload.videoRequired);
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Step 3 (Timeline) es opcional, pasa directamente
      if (!draft.name.trim()) {
        setDraft({ name: 'Mi Tarjeta AR' });
      }
      setCurrentStep(4);
    }
  };

  const handlePrev = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const onSave = async () => {
    setStepError(null);
    const finalName = draft.name.trim() || 'Mi Tarjeta AR';
    if (!draft.name.trim()) {
      setDraft({ name: finalName });
    }

    if (!isStep1Valid || !isStep2Valid) {
      setStepError('Faltan archivos requeridos para guardar.');
      return;
    }

    setSaving(true);
    try {
      const id = await commitDraft();
      navigate(`/project/${id}`);
    } catch {
      setStepError(es.scan.errors['asset-missing']);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDemo = async () => {
    try {
      setCreatingDemo(true);
      const demoId = await createDemoProject();
      navigate(`/scan?project=${demoId}`);
    } catch {
      setStepError('No se pudo generar el proyecto demo.');
    } finally {
      setCreatingDemo(false);
    }
  };

  const steps = [
    { number: 1, label: es.upload.step1, isDone: isStep1Valid },
    { number: 2, label: es.upload.step2, isDone: isStep2Valid },
    { number: 3, label: es.upload.step3, isDone: draft.messages.length > 0 },
    { number: 4, label: es.upload.step4, isDone: canSave },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Cabecera */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">{es.upload.title}</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Sigue estos 4 pasos guiados para crear tu experiencia de realidad aumentada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateDemo}
            disabled={creatingDemo}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            {creatingDemo ? es.home.creatingDemo : es.upload.quickDemo}
          </button>
          <Link to="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← {es.detail.back}
          </Link>
        </div>
      </header>

      {/* Stepper / Barra de progreso */}
      <nav aria-label="Progreso de configuración" className="grid grid-cols-4 gap-2">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => {
                // Permitir navegar a pasos previos o al siguiente si ya es válido
                if (step.number < currentStep || (step.number === 2 && isStep1Valid) || (step.number === 3 && isStep1Valid && isStep2Valid)) {
                  setStepError(null);
                  setCurrentStep(step.number);
                }
              }}
              className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-sm shadow-indigo-500/20'
                  : step.isDone
                    ? 'border-emerald-500/40 bg-zinc-900/60 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : step.isDone
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {step.isDone && !isActive ? '✓' : step.number}
                </span>
                <span className="hidden text-xs font-medium sm:inline">{step.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Alerta de error si aplica */}
      {stepError ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-400">
          ⚠️ {stepError}
        </div>
      ) : null}

      {/* Contenido dinámico según el paso actual */}
      <div className="transition-all duration-200">
        {currentStep === 1 && <TargetUploader />}

        {currentStep === 2 && <VideoUploader />}

        {currentStep === 3 && <TimelineEditor />}

        {currentStep === 4 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-zinc-100">{es.upload.formTitle}</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Personaliza el nombre de tu proyecto y ajusta las opciones finales antes de probarlo.
            </p>

            {/* Resumen visual de lo configurado */}
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {es.upload.summaryTitle}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  {targetPreviewUrl ? (
                    <img
                      src={targetPreviewUrl}
                      alt="Target"
                      className="h-12 w-12 rounded-lg border border-zinc-700 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-zinc-800" />
                  )}
                  <div>
                    <span className="block text-xs font-medium text-zinc-300">{es.upload.summaryTarget}</span>
                    <span className="text-xs text-zinc-400">
                      {draft.targetMindFileName || 'card.mind'} ({draft.targetPhysicalWidthCm} cm)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-xs font-medium text-zinc-300">{es.upload.summaryVideo}</span>
                  <span className="text-xs text-emerald-400">
                    ✓ {draft.videoFileName || 'Vídeo cargado'}
                  </span>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-xs font-medium text-zinc-300">{es.upload.summaryMessages}</span>
                  <span className="text-xs text-zinc-400">
                    {draft.messages.length > 0
                      ? `${draft.messages.length} mensajes programados`
                      : 'Sin mensajes (solo vídeo)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Nombre del proyecto */}
            <div className="mt-5">
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

            {/* Opciones de bucle y sonido */}
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={draft.loop}
                  className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 accent-indigo-500"
                  onChange={(e) => setDraft({ loop: e.target.checked })}
                />
                {es.upload.loopLabel}
              </label>

              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={draft.muted}
                  className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 accent-indigo-500"
                  onChange={(e) => setDraft({ muted: e.target.checked })}
                />
                {es.upload.mutedLabel}
              </label>
            </div>
          </section>
        )}
      </div>

      {/* Botones de navegación del Wizard */}
      <footer className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
        {currentStep > 1 ? (
          <Button type="button" variant="secondary" onClick={handlePrev}>
            ← {es.upload.prev}
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <Button type="button" onClick={handleNext}>
              {es.upload.next} →
            </Button>
          ) : (
            <Button onClick={onSave} disabled={!canSave || saving}>
              {saving ? es.upload.saving : es.upload.save}
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
