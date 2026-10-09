import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import es from '../locales/es.json';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useProject } from '../hooks/useIndexedDB';
import { deleteProject } from '../db/indexedDB';

// Detalle del proyecto guardado (lectura; edición de mensajes en Sprint 3).
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { project, state } = useProject(id);
  const navigate = useNavigate();

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
        <h1 className="truncate text-2xl font-bold text-zinc-50">{project.name}</h1>
        <Link to="/" className="shrink-0 text-sm text-zinc-400 hover:text-zinc-200">
          ← {es.detail.back}
        </Link>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-300">
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
            <dt className="text-zinc-500">{es.detail.created}</dt>
            <dd className="mt-0.5">{created}</dd>
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

      <div className="flex flex-wrap gap-3">
        <Link to={`/scan?project=${project.id}`} className="contents">
          <Button>{es.projects.scan}</Button>
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
    </main>
  );
}
