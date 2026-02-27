import { useState, useEffect, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, ShieldCheck, AlertCircle, Palette, Cpu, Moon, Sun, ChevronLeft, Settings2, Eye, EyeOff, Pipette, Plus, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import clsx from 'clsx';

const ACCENT_COLORS = [
  { name: 'Neon Cyan', value: '#00f3ff' },
  { name: 'Cyber Purple', value: '#a855f7' },
  { name: 'Matrix Green', value: '#22c55e' },
  { name: 'Solar Orange', value: '#f97316' },
  { name: 'Plasma Pink', value: '#ec4899' },
  { name: 'Electric Blue', value: '#3b82f6' },
  { name: 'Crimson Red', value: '#ef4444' },
  { name: 'Golden Yellow', value: '#eab308' },
  { name: 'Mint Frost', value: '#2dd4bf' },
  { name: 'Lavender Haze', value: '#818cf8' },
  { name: 'Rose Gold', value: '#fb7185' },
  { name: 'Deep Sea', value: '#0369a1' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Slate', value: '#475569' },
  { name: 'Midnight', value: '#1e293b' },
  { name: 'Iridescent Black', value: '#1a1a1a' },
  { name: 'Royal Indigo', value: '#4338ca' },
  { name: 'Sunset Rose', value: '#be123c' },
  { name: 'Forest Moss', value: '#166534' },
  { name: 'Oceanic Teal', value: '#0f766e' },
  { name: 'Volcanic Ash', value: '#334155' },
  { name: 'Stellar White', value: '#f8fafc' },
];

export default function SettingsOverlay() {
  const { 
    apiKey, setApiKey, 
    isSettingsOpen, setSettingsOpen,
    activeSettingsPage, setActiveSettingsPage,
    themeMode, setThemeMode,
    accentColor, setAccentColor
  } = useSettingsStore();

  const [inputValue, setInputValue] = useState(apiKey || '');
  const [error, setError] = useState('');
  const [showAllColors, setShowAllColors] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSettingsOpen && !apiKey && !activeSettingsPage) {
      setActiveSettingsPage('api');
    }
  }, [isSettingsOpen, apiKey, activeSettingsPage, setActiveSettingsPage]);

  // Apply Theme and Accent Color to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.style.setProperty('--accent-primary', accentColor);
    // Add 10% opacity for the dim version
    const dimColor = accentColor.startsWith('#') ? `${accentColor}1a` : accentColor;
    document.documentElement.style.setProperty('--accent-dim', dimColor);
  }, [themeMode, accentColor]);

  // Handle History API for back button
  useEffect(() => {
    const handlePopState = () => {
      if (activeSettingsPage) {
        setActiveSettingsPage(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeSettingsPage, setActiveSettingsPage]);

  const closePage = () => {
    if (activeSettingsPage) {
      if (window.history.state?.settingsPage) {
        window.history.back();
      } else {
        setActiveSettingsPage(null);
      }
    } else {
      setSettingsOpen(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim().length < 10) {
      setError('Invalid API Key format');
      return;
    }
    setApiKey(inputValue.trim());
    setError('');
  };

  const renderContent = () => {
    switch (activeSettingsPage) {
      case 'api':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-xl w-full"
          >
            <div className="mb-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-neon-cyan-dim)] text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30">
              <Key size={32} />
            </div>
            <h3 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">API Configuration</h3>
            <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
              Enter your Gemini API Key to activate the Neural Speech Engine. 
              The key is stored locally on your device and never leaves your browser.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="password"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter your Gemini API Key"
                  className="w-full rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] px-6 py-4 pl-14 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:border-[var(--color-neon-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)] transition-all"
                />
                <ShieldCheck className="absolute left-5 top-5 h-6 w-6 text-[var(--color-text-secondary)]" />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setApiKey('');
                  }}
                  className="flex-1 rounded-2xl border border-red-500/30 px-6 py-4 font-bold text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-widest text-xs"
                >
                  Clear Key
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-2xl bg-[var(--color-neon-cyan)] px-6 py-4 font-bold text-[var(--color-text-on-accent)] transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs shadow-[0_0_20px_var(--accent-dim)]"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </motion.div>
        );

      case 'appearance':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl w-full space-y-12"
          >
            <div className="mb-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-neon-cyan-dim)] text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30">
              <Palette size={32} />
            </div>
            
            <section>
              <h4 className="mb-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.3em]">Theme Mode</h4>
              <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => setThemeMode('dark')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-4 rounded-3xl border p-8 transition-all",
                    themeMode === 'dark'
                      ? "border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)] text-[var(--color-text-primary)]"
                      : "border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                  )}
                >
                  <Moon size={32} className="shrink-0" />
                  <span className="font-bold uppercase tracking-widest text-xs">Dark Mode</span>
                </button>
                <button
                  onClick={() => setThemeMode('light')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-4 rounded-3xl border p-8 transition-all",
                    themeMode === 'light'
                      ? "border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)] text-[var(--color-text-primary)]"
                      : "border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                  )}
                >
                  <Sun size={32} className="shrink-0" />
                  <span className="font-bold uppercase tracking-widest text-xs">Light Mode</span>
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.3em]">Accent Color</h4>
                <div className="flex items-center gap-2 bg-[var(--accent-dim)] px-3 py-1 rounded-full border border-[var(--accent-primary)]/20">
                  <div 
                    className="h-2 w-2 rounded-full shadow-[0_0_8px_var(--accent-primary)]"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
                    {ACCENT_COLORS.find(c => c.value === accentColor)?.name || 'Custom'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 p-6 rounded-3xl border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={clsx(
                      "group relative flex flex-col items-center gap-3 transition-all",
                      accentColor === color.value ? "scale-110" : "opacity-40 hover:opacity-100 hover:scale-105"
                    )}
                  >
                    <div 
                      className={clsx(
                        "h-10 w-10 rounded-full border-2 shadow-lg transition-all",
                        accentColor === color.value ? "border-[var(--color-text-primary)] scale-110 shadow-[0_0_15px_var(--accent-primary)]" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-[8px] font-bold uppercase tracking-tighter text-center w-full truncate text-[var(--color-text-primary)]">
                      {color.name}
                    </span>
                  </button>
                ))}
                
                {/* Custom Color Picker */}
                <button
                  onClick={() => colorInputRef.current?.click()}
                  className={clsx(
                    "group relative flex flex-col items-center gap-3 transition-all",
                    !ACCENT_COLORS.some(c => c.value === accentColor) ? "scale-110" : "opacity-40 hover:opacity-100 hover:scale-105"
                  )}
                >
                  <div 
                    className={clsx(
                      "h-10 w-10 rounded-full border-2 border-dashed shadow-2xl transition-all flex items-center justify-center bg-[var(--color-bg-hover)]",
                      !ACCENT_COLORS.some(c => c.value === accentColor) ? "border-[var(--color-text-primary)]" : "border-[var(--color-text-secondary)]/20"
                    )}
                    style={!ACCENT_COLORS.some(c => c.value === accentColor) ? { backgroundColor: accentColor } : {}}
                  >
                    <Plus size={16} className="text-[var(--color-text-primary)]" />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-center w-full truncate text-[var(--color-text-primary)]">
                    Custom
                  </span>
                  <input 
                    ref={colorInputRef}
                    type="color" 
                    className="sr-only" 
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                </button>
              </div>
            </section>

            <section>
              <h4 className="mb-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.3em]">More Options</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 rounded-3xl border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Eye size={20} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-[var(--color-text-primary)]">High Contrast Mode</h5>
                      <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest">Enhanced visibility</p>
                    </div>
                  </div>
                  <div className="h-6 w-12 rounded-full bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] relative cursor-not-allowed opacity-50">
                    <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--color-text-secondary)]/20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 rounded-3xl border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Settings2 size={20} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-[var(--color-text-primary)]">Experimental UI</h5>
                      <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest">Beta features</p>
                    </div>
                  </div>
                  <div className="h-6 w-12 rounded-full bg-[var(--color-bg-hover)] border border-[var(--color-glass-border)] relative cursor-not-allowed opacity-50">
                    <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--color-text-secondary)]/20" />
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        );

      case 'model':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-xl w-full text-center py-12"
          >
            <div className="mx-auto mb-8 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--color-neon-cyan-dim)] text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30 shadow-[0_0_40px_var(--accent-dim)]">
              <Cpu size={48} />
            </div>
            <h3 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Neural Engine</h3>
            <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
              Advanced model parameters including Temperature, Top-P, and custom system instructions are currently being calibrated for the next deployment.
            </p>
            <div className="inline-block px-6 py-2 rounded-full border border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan-dim)] text-[var(--color-neon-cyan)] text-xs font-bold uppercase tracking-widest">
              System Calibrating...
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <button
              onClick={() => setActiveSettingsPage('api')}
              className="group flex flex-col items-center justify-center gap-6 rounded-[2rem] border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] p-10 transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-dim)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 group-hover:scale-110 transition-transform shadow-[0_0_15px_var(--accent-dim)]">
                <Key size={32} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-widest mb-1">API Config</h4>
                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-tighter">Neural Link</p>
              </div>
              <div className="h-1 w-8 rounded-full bg-[var(--accent-primary)] opacity-20 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_var(--accent-primary)]" />
            </button>

            <button
              onClick={() => setActiveSettingsPage('appearance')}
              className="group flex flex-col items-center justify-center gap-6 rounded-[2rem] border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] p-10 transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-dim)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 group-hover:scale-110 transition-transform shadow-[0_0_15px_var(--accent-dim)]">
                <Palette size={32} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-widest mb-1">Appearance</h4>
                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-tighter">UI Calibration</p>
              </div>
              <div className="h-1 w-8 rounded-full bg-[var(--accent-primary)] opacity-20 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_var(--accent-primary)]" />
            </button>

            <button
              onClick={() => setActiveSettingsPage('model')}
              className="group flex flex-col items-center justify-center gap-6 rounded-[2rem] border border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] p-10 transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-dim)]"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 group-hover:scale-110 transition-transform shadow-[0_0_15px_var(--accent-dim)]">
                <Cpu size={32} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-widest mb-1">Neural Engine</h4>
                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-tighter">Model Tuning</p>
              </div>
              <div className="h-1 w-8 rounded-full bg-[var(--accent-primary)] opacity-20 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_var(--accent-primary)]" />
            </button>
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[60] bg-[var(--color-cyber-black)] flex flex-col p-6 noise-overlay overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-12 relative">
            <div className="flex items-center">
              {activeSettingsPage && apiKey && (
                <button 
                  onClick={closePage}
                  className="p-3 -ml-3 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-full transition-all active:scale-90"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2">
              {apiKey && (
                <div className="flex items-center gap-2.5 text-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)] px-4 py-1.5 rounded-full border border-[var(--color-neon-cyan)]/30 shadow-[0_0_15px_var(--accent-dim)] whitespace-nowrap">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]">System Active</span>
                </div>
              )}
            </div>

            {apiKey && !activeSettingsPage && (
              <button 
                onClick={() => setSettingsOpen(false)}
                className="p-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-full transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Page Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
            {renderContent()}
          </div>

          {/* Footer Branding */}
          <div className="fixed bottom-8 left-0 right-0 text-center pointer-events-none opacity-20">
             <span className="text-[10px] font-bold uppercase tracking-[1em] text-[var(--color-text-primary)]">
               THIS APP CREATED BY SHEIKH SADI
             </span>
             <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider mt-2">
               MUTU ARCHITECTURE
             </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
