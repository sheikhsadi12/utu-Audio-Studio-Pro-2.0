import { useState, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Trash2, Download, Play, Edit2, Check, Music, Archive, MoreVertical, X, Scissors } from 'lucide-react';
import RenameModal from './RenameModal';
import { storageService, AudioFile } from '../lib/StorageService';
import { audioEngine } from '../lib/AudioEngine';
import { useSettingsStore } from '../store/useSettingsStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

export default function AudioLibrary() {
  const [audios, setAudios] = useState<AudioFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingAudio, setRenamingAudio] = useState<AudioFile | null>(null);
  const [pendingMergeBlob, setPendingMergeBlob] = useState<Blob | null>(null);
  const { setIsPlaying, setPlaylist, setCurrentIndex, setSidebarOpen } = useSettingsStore();

  // Refresh library trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMerging, setIsMerging] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [transitionType, setTransitionType] = useState<'gap' | 'crossfade'>('gap');
  const [trimmingId, setTrimmingId] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState('0');
  const [trimEnd, setTrimEnd] = useState('0');

  const [activeTab, setActiveTab] = useState<'recordings' | 'merged'>('recordings');
  const [mergedAudios, setMergedAudios] = useState<AudioFile[]>([]);

  useEffect(() => {
    loadLibrary();
    // Listen for custom event to refresh library when new audio is saved
    const handleRefresh = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('library-updated', handleRefresh);
    return () => window.removeEventListener('library-updated', handleRefresh);
  }, [refreshKey]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadLibrary = async () => {
    const files = await storageService.getAudios();
    // Sort by newest first
    const sorted = files.sort((a, b) => b.timestamp - a.timestamp);
    const regularFiles = sorted.filter(f => !f.style.includes('Merged'));
    const mergedFiles = sorted.filter(f => f.style.includes('Merged'));
    setAudios(regularFiles);
    setMergedAudios(mergedFiles);
    setPlaylist(sorted);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this audio?')) {
      await storageService.deleteAudio(id);
      loadLibrary();
    }
  };

  const handlePlay = (audio: AudioFile, index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true); // Optimistically set playing state
    audioEngine.loadBlob(audio.blob).then(() => {
      // The play logic is now handled inside loadBlob
    }).catch(error => {
      console.error("Failed to play audio:", error);
      setIsPlaying(false); // Revert on error
    });
  };

  const handleDownload = (audio: AudioFile) => {
    saveAs(audio.blob, `${audio.title}_${audio.voice}_AI.mp3`);
  };

  const handleDownloadSelected = async () => {
    const zip = new JSZip();
    const targetAudios = selectedIds.size > 0 
        ? audios.filter(a => selectedIds.has(a.id))
        : audios;
        
    targetAudios.forEach(audio => {
      zip.file(`${audio.title}_${audio.voice}_AI.mp3`, audio.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, selectedIds.size > 0 ? 'Selected_Recordings.zip' : 'Mutu_Audio_Library.zip');
  };

  const startTrimming = (audio: AudioFile) => {
    setTrimmingId(audio.id);
    setTrimStart('0');
    setTrimEnd(audio.duration ? audio.duration.toFixed(2) : '0');
    setActiveMenuId(null);
  };

  const handleTrim = async (id: string) => {
    const audio = audios.find(a => a.id === id);
    if (!audio) return;
    
    const start = parseFloat(trimStart);
    const end = parseFloat(trimEnd);
    
    if (isNaN(start) || isNaN(end) || start >= end) {
      alert("Invalid trim times");
      return;
    }
    
    const trimmedBlob = await audioEngine.trimAudio(audio.blob, start, end);
    if (trimmedBlob) {
      await storageService.saveAudio({
        id: crypto.randomUUID(),
        title: `${audio.title} (Trimmed)`,
        voice: audio.voice,
        style: audio.style,
        duration: end - start,
        timestamp: Date.now(),
        blob: trimmedBlob
      });
      setTrimmingId(null);
      loadLibrary();
      window.dispatchEvent(new CustomEvent('library-updated'));
    } else {
      alert("Trim failed");
    }
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) {
      alert('Please select at least 2 recordings to merge.');
      return;
    }

    setIsMerging(true);
    try {
      const selectedAudios = audios.filter(a => selectedIds.has(a.id));
      const blobs = selectedAudios.map(a => a.blob);
      
      const mergedBlob = await audioEngine.mergeAudios(blobs, transitionType);
      if (mergedBlob) {
        setPendingMergeBlob(mergedBlob);
        setIsRenameModalOpen(true);
      }
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Merge failed. Check console for details.');
    } finally {
      setIsMerging(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

    const startEditing = (audio: AudioFile) => {
    setRenamingAudio(audio);
    setIsRenameModalOpen(true);
    setActiveMenuId(null);
  };

    const handleRename = async (newName: string) => {
    if (renamingAudio) {
      await storageService.updateAudio(renamingAudio.id, { title: newName });
      loadLibrary();
    }
    setIsRenameModalOpen(false);
    setRenamingAudio(null);
  };

  const filteredAudios = audios.filter(audio => 
    audio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audio.voice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMergedAudios = mergedAudios.filter(audio => 
    audio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audio.voice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAudioList = (list: AudioFile[], isMergedList = false) => {
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 rounded-full bg-[var(--color-bg-hover)] p-4 text-[var(--color-text-secondary)]">
            <Archive size={24} />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{isMergedList ? 'No merged files found' : 'No recordings found'}</p>
        </div>
      );
    }

    return list.map((audio, index) => (
      <motion.div
        layout
        key={audio.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={clsx(
          "group relative flex items-center gap-3 rounded-lg border border-transparent bg-[var(--color-bg-hover)] p-3 hover:border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)]/80 transition-all noise-overlay",
          selectedIds.has(audio.id) ? "border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)]/20 shadow-[0_0_15px_rgba(0,255,242,0.1)]" : "hover:translate-x-1"
        )}
        onClick={() => isSelectionMode && toggleSelection(audio.id)}
      >
        <AnimatePresence>
          {isSelectionMode && !isMergedList && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex items-center overflow-hidden"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(audio.id)}
                onChange={() => toggleSelection(audio.id)}
                className="h-4 w-4 rounded border-gray-700 bg-black/50 text-[var(--color-neon-cyan)] focus:ring-[var(--color-neon-cyan)] cursor-pointer"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={(e) => {
            if (isSelectionMode) return;
            e.stopPropagation();
            handlePlay(audio, index);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-neon-cyan-dim)] hover:text-[var(--color-neon-cyan)] transition-all"
        >
          <Play size={14} fill="currentColor" className="ml-0.5" />
        </button>

        <div className="flex-1 min-w-0">
           
            <div>
              <h4 className="truncate text-sm font-medium text-[var(--color-text-primary)]">{audio.title}</h4>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <span>{audio.voice}</span>
                <span>•</span>
                <span>{new Date(audio.timestamp).toLocaleDateString()}</span>
              </div>
              {trimmingId === audio.id && (
                <div className="flex items-center gap-2 mt-2 bg-[var(--color-bg-surface)] p-2 rounded animate-in fade-in slide-in-from-top-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">Start:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    className="w-16 rounded bg-[var(--color-bg-hover)] px-1 py-0.5 text-xs text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-neon-cyan)]"
                  />
                  <span className="text-xs text-[var(--color-text-secondary)]">End:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    className="w-16 rounded bg-[var(--color-bg-hover)] px-1 py-0.5 text-xs text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-neon-cyan)]"
                  />
                  <button onClick={() => handleTrim(audio.id)} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                  <button onClick={() => setTrimmingId(null)} className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                </div>
              )}
            </div>
        </div>

        {/* 3-Dot Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === audio.id ? null : audio.id);
            }}
            className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-hover)]"
          >
            <MoreVertical size={16} />
          </button>

          <AnimatePresence>
            {activeMenuId === audio.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-cyber-black)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col p-1.5">
                  <button
                    onClick={() => startEditing(audio)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <Edit2 size={14} />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      handleDownload(audio);
                      setActiveMenuId(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    onClick={() => startTrimming(audio)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <Scissors size={14} />
                    Trim
                  </button>

                  <button
                    onClick={() => {
                      handleDelete(audio.id);
                      setActiveMenuId(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    ));
  };

  return (
    <div className="flex flex-col h-full">
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setRenamingAudio(null);
          setPendingMergeBlob(null);
        }}
        onRename={async (newName) => {
          if (pendingMergeBlob) {
            await storageService.saveAudio({
              id: crypto.randomUUID(),
              title: newName,
              voice: 'Multi-Voice',
              style: 'Merged',
              duration: 0, // Will be calculated on play
              timestamp: Date.now(),
              blob: pendingMergeBlob,
            });
            setSelectedIds(new Set());
            loadLibrary();
            setPendingMergeBlob(null);
            setIsRenameModalOpen(false);
          } else if (renamingAudio) {
            await handleRename(newName);
          }
        }}
        currentName={renamingAudio ? renamingAudio.title : `Merged Recording ${new Date().toLocaleTimeString()}`}
        itemType={pendingMergeBlob ? 'merged file' : 'recording'}
      />
      {/* Header & Selection Toggle */}
      <div className="px-4 py-3 border-b border-[var(--color-glass-border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-bold tracking-[0.1em] text-[var(--color-neon-cyan)] uppercase">
            <Music size={16} />
            <span>MUTU AUDIO</span>
          </div>
          <button 
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
            className={clsx(
              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition-colors",
              isSelectionMode ? "bg-[var(--color-neon-cyan)] text-[var(--color-text-on-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-glass-border)]"
            )}
          >
            {isSelectionMode ? 'Cancel' : 'Select'}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:border-[var(--color-neon-cyan)] focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-glass-border)]">
        <button
          onClick={() => setActiveTab('recordings')}
          className={clsx(
            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === 'recordings' 
              ? "text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)]/10" 
              : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
          )}
        >
          Recordings
        </button>
        <button
          onClick={() => setActiveTab('merged')}
          className={clsx(
            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === 'merged' 
              ? "text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)]/10" 
              : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
          )}
        >
          Margin Files
        </button>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'recordings' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'recordings' ? 10 : -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-1"
          >
            {activeTab === 'recordings' 
              ? renderAudioList(filteredAudios)
              : renderAudioList(filteredMergedAudios, true)
            }
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      {audios.length > 0 && selectedIds.size > 0 && (
        <div className="sticky bottom-0 p-2 bg-gradient-to-t from-[var(--color-cyber-black)] via-[var(--color-cyber-black)] to-transparent pt-6">
          <div className="rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)]/80 backdrop-blur-md p-1.5 space-y-1.5 shadow-2xl">
            {selectedIds.size >= 2 && (
              <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-4 text-[9px] text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] py-0.5 rounded-md">
                      <label className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-primary)]">
                          <input 
                              type="radio" 
                              name="transition" 
                              checked={transitionType === 'gap'} 
                              onChange={() => setTransitionType('gap')}
                              className="accent-[var(--color-neon-cyan)]"
                          /> Gap
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-primary)]">
                          <input 
                              type="radio" 
                              name="transition" 
                              checked={transitionType === 'crossfade'} 
                              onChange={() => setTransitionType('crossfade')}
                              className="accent-[var(--color-neon-cyan)]"
                          /> Crossfade
                      </label>
                  </div>
                  <button
                  onClick={handleMerge}
                  disabled={isMerging}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-neon-cyan)] py-1.5 text-[10px] font-bold text-[var(--color-text-on-accent)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                  {isMerging ? 'MERGING...' : `MERGE SELECTED (${selectedIds.size})`}
                  </button>
              </div>
            )}
            <button
              onClick={handleDownloadSelected}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-bg-surface)] py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              <Archive size={12} />
              Download Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
