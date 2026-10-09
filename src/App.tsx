import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Spinner } from './components/ui/Spinner';
import Home from './pages/Home';
import Upload from './pages/Upload';
import ProjectDetail from './pages/ProjectDetail';

// /scan carga MindAR + TensorFlow.js (~2 MB): se separa en su propio chunk
// para que el Home no pague ese peso (requisito de performance)
const Scan = lazy(() => import('./pages/Scan'));

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-zinc-950 text-zinc-100">
        <Suspense
          fallback={
            <div className="flex min-h-dvh items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
