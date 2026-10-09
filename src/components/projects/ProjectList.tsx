import es from '../../locales/es.json';
import { Spinner } from '../ui/Spinner';
import { ProjectCard } from './ProjectCard';
import { useProjectList } from '../../hooks/useIndexedDB';
import { deleteProject } from '../../db/indexedDB';

// Lista de proyectos guardados en IndexedDB, con recarga tras borrar.
export function ProjectList() {
  const { projects, state, reload } = useProjectList();

  if (state === 'loading') {
    return <Spinner label={es.projects.loading} />;
  }

  if (state === 'error') {
    return (
      <p role="alert" className="text-sm text-red-400">
        {es.scan.errors['asset-missing']}
      </p>
    );
  }

  if (projects.length === 0) {
    return <p className="text-sm text-zinc-400">{es.home.projectsEmpty}</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={async (id) => {
            await deleteProject(id);
            reload();
          }}
        />
      ))}
    </ul>
  );
}
