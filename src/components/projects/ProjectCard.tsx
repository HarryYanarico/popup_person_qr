import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import es from '../../locales/es.json';
import { Button } from '../ui/Button';
import type { Project } from '../../types/project';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

// Tarjeta de proyecto en Home: preview de la imagen de la tarjeta + acciones.
export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  // Miniatura: objectURL derivada del blob, revocada al cambiar o desmontar
  const previewUrl = useMemo(
    () => URL.createObjectURL(project.targetImageBlob),
    [project.targetImageBlob],
  );
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const updatedAt = format(project.updatedAt, "d 'de' MMMM, HH:mm", { locale: esLocale });

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center">
      <img
        src={previewUrl}
        alt={project.name}
        className="h-24 w-40 shrink-0 rounded-xl border border-zinc-800 object-cover"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-zinc-100">{project.name}</h3>
        <p className="mt-1 text-xs text-zinc-500">
          {es.projects.updated.replace('{date}', updatedAt)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {es.projects.videoSize.replace('{size}', formatBytes(project.videoBlob.size))} ·{' '}
          {project.messages.length} mensajes
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Link to={`/scan?project=${project.id}`} className="contents">
          <Button size="sm">{es.projects.scan}</Button>
        </Link>
        <Link to={`/project/${project.id}`} className="contents">
          <Button size="sm" variant="secondary">
            {es.projects.detail}
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (window.confirm(es.projects.confirmDelete)) onDelete(project.id);
          }}
        >
          {es.projects.delete}
        </Button>
      </div>
    </li>
  );
}
