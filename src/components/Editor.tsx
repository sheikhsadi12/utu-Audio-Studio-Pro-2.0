import { useState, useRef, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { Type, Trash2, Sparkles, Zap, Loader2, Menu, Mic, Upload, X } from 'lucide-react';
import clsx from 'clsx';
import VoiceSelector from './VoiceSelector';
import { audioEngine } from '../lib/AudioEngine';
import { useSettingsStore } from '../store/useSettingsStore';
import Toast, { ToastRef } from './Toast';

export default function Editor() {
  const [text, setText] = useState('');
  const [styleInstruction, setStyleInstruction] = useState('');
  const { isGenerating, apiKey, setSidebarOpen, clonedVoiceData, setClonedVoiceData } = useSettingsStore();
  const toastRef = useRef<ToastRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    setText('');
    setStyleInstruction('');
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toastRef.current?.show("Please upload an audio file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setClonedVoiceData(base64);
      toastRef.current?.show("Voice sample uploaded successfully.");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      toastRef.current?.show("Please enter some text to synthesize.");
      return;
    }
    if (!apiKey) {
      toastRef.current?.show("Neural Link Failed: Missing API Key.");
      return;
    }

    try {
      await audioEngine.generateAudio(text, styleInstruction);
    } catch (error) {
      toastRef.current?.show("Synthesis Failed: Check API Key or Quota.");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-8 overflow-y-auto pb-32">
      <Toast ref={toastRef} />
      
      {/* Style Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-neon-cyan)]">
            <Sparkles size={12} />
            <span>Style Instructions</span>
          </label>
          <div className="relative group">
            <input
              type="text"
              value={styleInstruction}
              onChange={(e) => setStyleInstruction(e.target.value)}
              placeholder="E.g., Speak like a news anchor..."
              className="w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] transition-all focus:border-[var(--color-neon-cyan)] focus:bg-[var(--color-bg-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-neon-cyan)]">
            <Mic size={12} />
            <span>AI Voice Cloning</span>
          </label>
          <div className="relative group">
            <div className={clsx(
              "flex items-center justify-between w-full rounded-xl border px-4 py-2.5 transition-all",
              clonedVoiceData ? "border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan-dim)]/10" : "border-[var(--color-glass-border)] bg-[var(--color-bg-hover)]"
            )}>
              <div className="flex items-center gap-3 overflow-hidden">
                {clonedVoiceData ? (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-neon-cyan)] text-[var(--color-text-on-accent)]">
                      <Mic size={14} />
                    </div>
                    <span className="truncate text-xs font-medium text-[var(--color-text-primary)]">Voice Sample Active</span>
                  </>
                ) : (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                      <Upload size={14} />
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">Upload voice sample (MP3/WAV)</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {clonedVoiceData ? (
                  <button 
                    onClick={() => setClonedVoiceData(null)}
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg bg-[var(--color-neon-cyan)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-on-accent)] hover:scale-105 transition-all"
                  >
                    Upload
                  </button>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="audio/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Text Area */}
      <div className="relative flex-[2] min-h-[400px]">
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-[var(--color-neon-cyan-dim)] to-transparent opacity-50 blur-sm" />
        <div className={clsx(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--color-cyber-black)]/40 backdrop-blur-2xl transition-all duration-500 noise-overlay",
          isGenerating 
            ? "border-[var(--color-neon-cyan)] shadow-[0_0_30px_rgba(0,255,242,0.2)]" 
            : "border-[var(--color-glass-border)]"
        )}>
          <div className="flex items-center justify-between border-b border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] px-4 py-1.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              <Type size={12} />
              <span>SCRIPT EDITOR</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">
                {text.length} chars
              </span>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
          </div>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your script here..."
            className="flex-1 resize-none bg-transparent p-6 text-base leading-relaxed text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none font-sans"
            spellCheck={false}
          />
          
          {/* Action Bar */}
          <div className="border-t border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] p-2 flex justify-end">
             <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-neon-cyan)] px-4 py-2 font-bold text-[var(--color-text-on-accent)] transition-all hover:scale-105 hover:shadow-[0_0_20px_var(--color-neon-cyan)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shimmer-button"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>SYNCING...</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" />
                    <span>SYNTHESIZE AUDIO</span>
                  </>
                )}
              </button>
          </div>
        </div>
      </div>

      {/* Voice Selector (Now at bottom) */}
      <VoiceSelector />
    </div>
  );
}
