import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AudioPlayer from './components/AudioPlayer';
import SettingsOverlay from './components/SettingsOverlay';
import SplashScreen from './components/SplashScreen';
import { useSettingsStore } from './store/useSettingsStore';
import { ShieldCheck, AlertTriangle, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const { apiKey, setSidebarOpen, setSettingsOpen } = useSettingsStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => {}} />}
      </AnimatePresence>
      
      <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-primary)] selection:text-[var(--text-on-accent)]">
        <Sidebar />
        
        <main className="flex flex-1 flex-col relative w-full bg-[var(--bg-secondary)]">
          {/* Top Nav / Status Bar */}
          <header className="flex h-12 items-center justify-between px-4 lg:px-8 bg-[var(--bg-secondary)] z-10 shrink-0 border-b border-[var(--border-glass)]">
            <div className="flex items-center gap-3 lg:hidden">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Menu size={20} />
              </button>
              <span className="font-bold text-[var(--accent-primary)] text-sm">MUTU</span>
            </div>

            <button 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center rounded-full border border-[var(--border-glass)] bg-[var(--bg-surface)] w-8 h-8 ml-auto hover:bg-[var(--bg-hover)] transition-all cursor-pointer group"
            >
              {apiKey ? (
                <div className="text-[var(--accent-primary)] group-hover:scale-110 transition-transform shrink-0">
                  <ShieldCheck size={16} />
                </div>
              ) : (
                <div className="text-[var(--accent-primary)] opacity-50 group-hover:scale-110 transition-transform shrink-0">
                  <AlertTriangle size={16} />
                </div>
              )}
            </button>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative px-4 sm:px-6 lg:px-8">
            <Editor />
          </div>

          {/* Bottom Player */}
          <AudioPlayer />
          
          {/* Modals */}
          <SettingsOverlay />
        </main>
      </div>
    </>
  );
}
