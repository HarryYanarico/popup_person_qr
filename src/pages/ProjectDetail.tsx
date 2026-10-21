import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import es from '../locales/es.json';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { QRCardModal } from '../components/project/QRCardModal';
import { useProject } from '../hooks/useIndexedDB';
import { deleteProject } from '../db/indexedDB';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { project, state } = useProject(id);
  const navigate = useNavigate();
  const [qrModalOpen, setQrModalOpen] = useState(false);

  if (state === 'loading') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <Spinner />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-zinc-400">{es.detail.notFound}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300">
          ← {es.detail.back}
        </Link>
      </main>
    );
  }

  const created = format(project.createdAt, "d 'de' MMMM yyyy, HH:mm", { locale: esLocale });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="truncate text-2xl font-bold text-zinc-50">{project.name}</h1>
          <p className="mt-0.5 text-xs text-zinc-400">Creado el {created}</p>
        </div>
        <Link to="/" className="shrink-0 text-sm text-zinc-400 hover:text-zinc-200">
          ← {es.detail.back}
        </Link>
      </header>

      {/* Sección destacada: Tarjeta QR para Imprimir */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-zinc-900/60 to-zinc-950/40 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
              🎴 Tarjeta Imprimible
            </span>
            <h2 className="mt-2 text-lg font-bold text-zinc-100">
              Imprime el código QR de este proyecto
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Descarga la tarjeta en PNG o imprímela en papel. Al escanear el QR con la cámara, la animación aparecerá sobre ella.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setQrModalOpen(true);
              }}
            >
              🖨️ Ver / Imprimir Tarjeta QR
            </Button>
          </div>
        </div>
      </section>

      {/* Detalles del proyecto */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-300">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Configuración del Proyecto</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">{es.detail.target}</dt>
            <dd className="mt-0.5 break-all">{project.targetName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{es.detail.width}</dt>
            <dd className="mt-0.5">{project.targetPhysicalWidthCm} cm</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{es.detail.loop}</dt>
            <dd className="mt-0.5">{project.loop ? es.detail.loopOn : es.detail.loopOff}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{es.detail.audio}</dt>
            <dd className="mt-0.5">{project.muted ? es.detail.audioOff : es.detail.audioOn}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">
              {es.detail.messages.replace('{count}', String(project.messages.length))}
            </dt>
            <dd className="mt-0.5 text-zinc-300">
              {project.messages.length} {project.messages.length === 1 ? 'mensaje' : 'mensajes'}
            </dd>
          </div>
        </dl>

        {project.messages.length > 0 ? (
          <div className="mt-6 border-t border-zinc-800 pt-5">
            <h2 className="text-sm font-semibold text-zinc-200">{es.detail.messagesList}</h2>
            <div className="mt-3 space-y-2">
              {project.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex flex-col gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                      ⏱ {msg.timestamp}s
                    </span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      ⏳ {msg.duration}s
                    </span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      📍 {msg.position}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs italic text-zinc-500">{es.detail.emptyMessages}</p>
        )}
      </section>

      {/* Botones de acción principales */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/scan?project=${project.id}&mode=qr`} className="contents">
          <Button>🎴 Escanear Tarjeta QR</Button>
        </Link>
        <Link to={`/scan?project=${project.id}&mode=surface`} className="contents">
          <Button variant="secondary">🌐 Probar en Superficie (Demo)</Button>
        </Link>
        <Button
          variant="danger"
          onClick={async () => {
            if (!window.confirm(es.projects.confirmDelete)) return;
            await deleteProject(project.id);
            navigate('/');
          }}
        >
          {es.projects.delete}
        </Button>
      </div>

      <QRCardModal project={project} isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} />
    </main>
  );
}
