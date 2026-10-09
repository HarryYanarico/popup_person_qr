import { Link } from 'react-router-dom';
import es from '../locales/es.json';
import { Button } from '../components/ui/Button';
import { ProjectList } from '../components/projects/ProjectList';

// Home: explicación breve, botones de navegación, tutorial y lista de proyectos.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-zinc-50 sm:text-4xl">
          {es.app.title}
        </h1>
        <p className="mt-3 text-zinc-400">{es.app.subtitle}</p>
      </header>

      <section className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link to="/upload" className="contents">
          <Button className="w-full sm:w-auto">{es.home.upload}</Button>
        </Link>
        <Link to="/scan" className="contents">
          <Button variant="secondary" className="w-full sm:w-auto">
            {es.home.scan}
          </Button>
        </Link>
      </section>

      <section aria-labelledby="proyectos" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 id="proyectos" className="text-xl font-semibold text-zinc-100">
          {es.home.projectsTitle}
        </h2>
        <ProjectList />
      </section>

      <section aria-labelledby="tutorial" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 id="tutorial" className="text-xl font-semibold text-zinc-100">
          {es.home.tutorialTitle}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
          {es.home.tutorial.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>

        <h3 className="mt-6 text-lg font-semibold text-zinc-100">
          {es.home.warningsTitle}
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">
          {es.home.warnings.map((consejo) => (
            <li key={consejo}>{consejo}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
