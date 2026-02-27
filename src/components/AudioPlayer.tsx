import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Mic2, Save, Check, Download, ChevronUp, ChevronDown, Music, SlidersHorizontal } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { audioEngine } from '../lib/AudioEngine';
import { useEffect, useState, ChangeEvent } from 'react';
import { storageService } from '../lib/StorageService';
import { saveAs } from 'file-saver';
import clsx from 'clsx';
import AudioVisualizer from './AudioVisualizer';

export default function AudioPlayer() {
  const { 
    isPlaying, isBuffering, progress, playbackSpeed, setPlaybackSpeed, 
    selectedVoice, currentAudioId, playlist, currentIndex, setCurrentIndex, setIsPlaying 
  } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false); // Track if current audio is already saved
  const [isExpanded, setIsExpanded] = useState(false); // For mobile expansion
  const [bgmVolume, setBgmVolume] = useState(0.5);
  const [pitch, setPitch] = useState(0);

  // Reset saved state when a new audio is generated
  useEffect(() => {
    setIsSaved(false);
  }, [currentAudioId]);

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handleNext = async () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    const audio = playlist[nextIndex];
    await audioEngine.loadBlob(audio.blob);
    audioEngine.play();
    setIsPlaying(true);
  };

  const handlePrevious = async () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIndex);
    const audio = playlist[prevIndex];
    await audioEngine.loadBlob(audio.blob);
    audioEngine.play();
    setIsPlaying(true);
  };

  const handleSpeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);
    audioEngine.setSpeed(speed);
  };

  const handleSave = async () => {
    if (isSaved) return; // Prevent double save

    const buffer = audioEngine.getAudioBuffer();
    if (!buffer) return;

    setIsSaving(true);
    
    // Simulate "Sealing" delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    const blob = audioEngine.exportMp3();
    if (blob) {
      const id = crypto.randomUUID();
      const filename = `Mutu_Recording_${Date.now()}.mp3`;
      
      // 1. Save to Library
      await storageService.saveAudio({
        id,
        title: `Recording ${new Date().toLocaleTimeString()}`,
        voice: selectedVoice,
        style: 'Custom',
        duration: buffer.duration,
        timestamp: Date.now(),
        blob
      });
      
      // Trigger library refresh
      window.dispatchEvent(new Event('library-updated'));
      
      setIsSaving(false);
      setIsSaved(true);
    } else {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = audioEngine.exportMp3();
    if (blob) {
      saveAs(blob, `Mutu_Recording_${Date.now()}.mp3`);
    } else if (currentTrack) {
      saveAs(currentTrack.blob, `${currentTrack.title}.mp3`);
    }
  };

  const currentTrack = currentIndex >= 0 ? playlist[currentIndex] : null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioEngine.seek(time);
  };

  return (
    <>
      <motion.div
        layout
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className={clsx(
          "border-t border-[var(--color-glass-border)] bg-[var(--color-cyber-black)]/80 backdrop-blur-2xl z-40 relative noise-overlay",
          "flex flex-col lg:flex-row lg:h-24 lg:items-center lg:justify-between lg:px-8",
          isExpanded 
            ? "h-full fixed inset-0 p-6 pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-none"
            : "h-20 px-4 justify-center"
        )}
      >
        {/* --- EXPANDED VIEW --- */}
        <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full w-full lg:hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 w-full flex justify-center mb-4" onClick={() => setIsExpanded(false)}>
              <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                  <ChevronDown size={16} />
                  <span className="text-xs uppercase tracking-widest">Collapse</span>
              </div>
            </div>

            {/* Cover Art */}
            <div className="flex-grow w-full rounded-2xl bg-gradient-to-br from-[var(--color-neon-cyan-dim)] to-transparent border border-[var(--color-glass-border)] flex items-center justify-center mb-4">
              <p className="text-sm text-[var(--color-text-secondary)]">AI Cover Art</p>
            </div>

            {/* Track Info & Visualizer */}
            <div className="flex-shrink-0 w-full text-center mb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] truncate">{currentTrack ? currentTrack.title : 'Capsule Player'}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">{currentTrack ? currentTrack.voice : 'Select Audio'}</p>
              <div className="flex items-center justify-center h-12 w-full">
                <AudioVisualizer className="w-full max-w-[300px]" />
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-6 justify-center w-full mb-6">
              <button onClick={handlePrevious} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"><SkipBack size={24} /></button>
              <button onClick={togglePlay} className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-cyan)] to-[var(--color-cyber-purple)] text-[var(--color-text-on-accent)] shadow-[0_0_20px_rgba(0,247,255,0.4)] transition-all hover:scale-105 active:scale-95">
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={handleNext} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"><SkipForward size={24} /></button>
            </div>

            <div className="flex-grow"></div> {/* Spacer */}

            {/* Progress Bar */}
            <div className="w-full mb-6">
              <input 
                type="range" 
                min="0" 
                max={currentTrack?.duration || 100}
                step="0.01"
                value={progress}
                onChange={handleSeek}
                className="w-full accent-[var(--color-neon-cyan)] h-2 bg-[var(--color-glass-border)] rounded-lg appearance-none cursor-pointer shadow-inner"
              />
              <div className="flex justify-between text-xs font-mono text-[var(--color-text-secondary)] mt-2">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(currentTrack?.duration || 0)}</span>
              </div>
            </div>

            {/* Advanced Controls */}
            <div className="w-full space-y-4 p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] noise-overlay">
              <div className="flex items-center gap-3">
                <Music size={16} className="text-[var(--color-text-secondary)]"/>
                <input type="range" min="0" max="1" step="0.01" value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full accent-[var(--color-neon-cyan)] h-1.5 bg-[var(--color-bg-hover)] rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={16} className="text-[var(--color-text-secondary)]"/>
                <input type="range" min="-12" max="12" step="1" value={pitch} onChange={(e) => setPitch(parseInt(e.target.value))} className="w-full accent-[var(--color-neon-cyan)] h-1.5 bg-[var(--color-bg-hover)] rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* --- COLLAPSED VIEW --- */}
        {!isExpanded && (
          <div className="flex items-center justify-between w-full">
            {/* Left: Info */}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
              <div className="h-12 w-12 rounded-lg bg-[var(--color-neon-cyan-dim)] flex items-center justify-center text-[var(--color-neon-cyan)] border border-[var(--color-glass-border)] shrink-0">
                <Mic2 size={24} />
              </div>
              <div className="flex flex-col justify-center overflow-hidden">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {currentTrack ? currentTrack.title : 'Capsule Player'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                    {Math.floor(progress / 60)}:{(progress % 60).toFixed(0).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Mini Controls */}
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="lg:hidden flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-cyan)] to-[var(--color-cyber-purple)] text-[var(--color-text-on-accent)] transition-all active:scale-95">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
          </div>
        )}
        
        {/* --- DESKTOP VIEW --- */}
        <div className="hidden lg:flex w-full items-center justify-between">
            {/* Left Info */}
            <div className="flex items-center gap-4 w-1/3">
                <div className="h-12 w-12 rounded-lg bg-[var(--color-neon-cyan-dim)] flex items-center justify-center text-[var(--color-neon-cyan)] border border-[var(--color-glass-border)] shrink-0">
                    <Mic2 size={24} />
                </div>
                <div>
                    <h4 className="font-medium text-[var(--color-text-primary)] truncate">{currentTrack ? currentTrack.title : 'Capsule Player'}</h4>
                    <span className="text-xs font-mono text-[var(--color-text-secondary)]">{Math.floor(progress / 60)}:{(progress % 60).toFixed(0).padStart(2, '0')}</span>
                </div>
            </div>

            {/* Center Controls */}
            <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="flex items-center gap-6 justify-center">
                    <button onClick={handlePrevious} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"><SkipBack size={20} /></button>
                    <button onClick={togglePlay} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-cyan)] to-[var(--color-cyber-purple)] text-[var(--color-text-on-accent)] shadow-[0_0_20px_rgba(0,247,255,0.4)] transition-all hover:scale-105 active:scale-95">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={handleNext} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"><SkipForward size={20} /></button>
                </div>
                <AudioVisualizer className="w-48 h-4 opacity-50" />
            </div>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-4 w-1/3">
                <button onClick={handleSave} disabled={isSaving || isSaved} className={clsx("transition-colors p-2", isSaved ? "text-green-400" : "text-[var(--color-text-secondary)] hover:text-[var(--color-neon-cyan)]")} title="Save to Library">
                    {isSaving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-[var(--color-neon-cyan)]" /> : isSaved ? <Check size={20} /> : <Save size={20} />}
                </button>
                <button onClick={handleDownload} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"><Download size={20} /></button>
            </div>
        </div>

      </motion.div>
    </>
  );
}
