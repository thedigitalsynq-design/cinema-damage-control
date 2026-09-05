import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandPalette } from './components/CommandPalette';
import { GooeyActions } from './components/GooeyActions';
import { ToastProvider } from './components/Toaster';

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

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2.5 overflow-y-auto px-6 py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-[#0a84ff]" />
      <span className="text-[13px] text-war-text-muted">Loading…</span>
    </div>
  );
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
      <ToastProvider>
      <MotionConfig reducedMotion="user">
      <div className="flex h-screen w-screen overflow-hidden bg-black text-[#f5f5f7]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
          <main className="flex flex-1 flex-col overflow-hidden bg-black">
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
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <GooeyActions onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
      </MotionConfig>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
