import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import es from '../locales/es.json';
import { Button } from '../components/ui/Button';
import { ProjectList } from '../components/projects/ProjectList';
import { createDemoProject } from '../utils/demoProject';

export default function Home() {
  const navigate = useNavigate();
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleLaunchDemo = async () => {
    try {
      setCreatingDemo(true);
      setDemoError(null);
      const projectId = await createDemoProject();
      navigate(`/scan?project=${projectId}&mode=surface&demo=1`);
    } catch {
      setDemoError('No se pudo crear el proyecto demo. Inténtalo nuevamente.');
    } finally {
      setCreatingDemo(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          {es.app.title}
        </h1>
        <p className="mt-3 text-zinc-400">{es.app.subtitle}</p>
      </header>

      {/* Banner / Acción rápida: Demo en superficie plana */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-purple-950/30 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
              ⚡ Modo Demo Inmediato
            </span>
            <h2 className="mt-2 text-lg font-bold text-zinc-100">
              Prueba la realidad aumentada en tu mesa o suelo
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Apunta la cámara a cualquier superficie plana y pulsa el botón para fijar la animación en el espacio. ¡Sin necesidad de imprimir nada!
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              onClick={handleLaunchDemo}
              disabled={creatingDemo}
              className="bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
            >
              {creatingDemo ? es.home.creatingDemo : '🚀 Probar Demo en Superficie'}
            </Button>
            <Link
              to="/upload"
              className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline"
            >
              O crea tu tarjeta con QR personalizada →
            </Link>
          </div>
        </div>

        {demoError ? (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {demoError}
          </p>
        ) : null}
      </section>

      {/* Navegación estándar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link to="/upload" className="contents">
          <Button className="w-full sm:w-auto">➕ Crear nueva tarjeta AR</Button>
        </Link>
        <Link to="/scan" className="contents">
          <Button variant="secondary" className="w-full sm:w-auto">
            📷 Abrir escáner AR
          </Button>
        </Link>
      </section>

      {/* Proyectos guardados */}
      <section aria-labelledby="proyectos" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg backdrop-blur-sm">
        <h2 id="proyectos" className="text-xl font-semibold text-zinc-100">
          {es.home.projectsTitle}
        </h2>
        <ProjectList />
      </section>

      {/* Cómo funcionan los dos modos */}
      <section aria-labelledby="tutorial" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg backdrop-blur-sm">
        <h2 id="tutorial" className="text-xl font-semibold text-zinc-100">
          ¿Cómo funcionan los dos modos?
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              1. Modo Demo (Superficie Plana)
            </span>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              No requiere imprimir tarjetas. Abre la cámara, apunta hacia tu mesa o suelo y verás una retícula holográfica. Al pulsar <strong>«Fijar en esta superficie»</strong>, la persona 3D aparecerá de pie animándose en ese lugar exacto.
            </p>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              2. Modo Tarjeta con Código QR
            </span>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              Crea tu proyecto o abre uno existente, genera la <strong>tarjeta QR en PNG</strong> e imprímela. Al abrir el escáner y apuntar a ese QR impreso, la animación 3D cobrará vida directamente encima de tu tarjeta física.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
