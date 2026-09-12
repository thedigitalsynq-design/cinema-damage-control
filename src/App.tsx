import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandPalette } from './components/CommandPalette';
import { GooeyActions } from './components/GooeyActions';
import { ToastProvider } from './components/Toaster';
import { PhaseProvider } from './components/PhaseContext';
import { ProjectProvider } from './components/ProjectContext';
import { RoomProvider } from './components/RoomState';
import { ThemeProvider } from './components/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './components/AuthContext';
import { LiveDataProvider } from './context/LiveDataContext';

// Route-level code splitting: each page loads on demand instead of one 700KB+ chunk.
const CommandCenter = lazy(() => import('./pages/CommandCenter').then((m) => ({ default: m.CommandCenter })));
const LiveSignals = lazy(() => import('./pages/LiveSignals').then((m) => ({ default: m.LiveSignals })));
const Incidents = lazy(() => import('./pages/Incidents').then((m) => ({ default: m.Incidents })));
const Narratives = lazy(() => import('./pages/Narratives').then((m) => ({ default: m.Narratives })));
const SocialIntelligence = lazy(() => import('./pages/SocialIntelligence').then((m) => ({ default: m.SocialIntelligence })));
const MediaIntelligence = lazy(() => import('./pages/MediaIntelligence').then((m) => ({ default: m.MediaIntelligence })));
const InfluencerIntelligence = lazy(() => import('./pages/InfluencerIntelligence').then((m) => ({ default: m.InfluencerIntelligence })));
const AudienceIntelligence = lazy(() => import('./pages/AudienceIntelligence').then((m) => ({ default: m.AudienceIntelligence })));
const ResponseCenter = lazy(() => import('./pages/ResponseCenter').then((m) => ({ default: m.ResponseCenter })));
const Recovery = lazy(() => import('./pages/Recovery').then((m) => ({ default: m.Recovery })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Leaks = lazy(() => import('./pages/Leaks').then((m) => ({ default: m.Leaks })));
const Analyst = lazy(() => import('./pages/Analyst').then((m) => ({ default: m.Analyst })));
const Films = lazy(() => import('./pages/Films').then((m) => ({ default: m.Films })));
const FilmDetail = lazy(() => import('./pages/FilmDetail').then((m) => ({ default: m.FilmDetail })));
const Markets = lazy(() => import('./pages/Markets').then((m) => ({ default: m.Markets })));

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2.5 overflow-y-auto px-6 py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-[#0a84ff]" />
      <span className="text-[13px] text-war-text-muted">Loading…</span>
    </div>
  );
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

function App() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Matches vite `base`: '/' in dev, '/cinema-damage-control' in production builds.
  const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
          <PhaseProvider>
          <ProjectProvider>
            <LiveDataProvider>
              <RoomProvider>
                <MotionConfig reducedMotion="user">
                  <div className="relative flex h-screen w-screen overflow-hidden p-2 sm:p-3 gap-2.5 sm:gap-3 bg-[var(--color-war-bg)] text-[var(--color-war-text)] transition-colors duration-500">
                    {/* Atmospheric ambient lighting blooms */}
                    <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-indigo-950/40 blur-[130px]" />
                    <div className="pointer-events-none absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-sky-950/30 blur-[140px]" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/3 h-[400px] w-[400px] rounded-full bg-purple-950/30 blur-[130px]" />

                    {/* Floating Glass Sidebar Rail */}
                    <Sidebar />

                    {/* Floating Bento Workspace Card */}
                    <div className="relative flex flex-1 flex-col overflow-hidden rounded-[26px] border border-[var(--color-war-border-light)] bg-[var(--color-war-surface)] backdrop-blur-2xl shadow-[var(--shadow-spatial-float)] transition-all duration-500">
                      <TopNav onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
                      <main className="flex flex-1 flex-col overflow-hidden bg-transparent transition-colors duration-500">
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageFallback />}>
                            <Routes>
                              <Route path="/" element={<CommandCenter />} />
                              <Route path="/signals" element={<LiveSignals />} />
                              <Route path="/incidents" element={<Incidents />} />
                              <Route path="/narratives" element={<Narratives />} />
                              <Route path="/social" element={<SocialIntelligence />} />
                              <Route path="/media" element={<MediaIntelligence />} />
                              <Route path="/influencers" element={<InfluencerIntelligence />} />
                              <Route path="/audience" element={<AudienceIntelligence />} />
                              <Route path="/response" element={<ResponseCenter />} />
                              <Route path="/recovery" element={<Recovery />} />
                              <Route path="/reports" element={<Reports />} />
                              <Route path="/leaks" element={<Leaks />} />
                              <Route path="/analyst" element={<Analyst />} />
                              <Route path="/films" element={<Films />} />
                              <Route path="/film/:id" element={<FilmDetail />} />
                              <Route path="/markets" element={<Markets />} />
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          </Suspense>
                        </RouteErrorBoundary>
                      </main>
                    </div>
                  </div>
                  <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
                  <GooeyActions onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
                </MotionConfig>
              </RoomProvider>
            </LiveDataProvider>
          </ProjectProvider>
        </PhaseProvider>
        </ToastProvider>
      </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
