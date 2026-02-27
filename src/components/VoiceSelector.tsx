import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore, VoiceName } from '../store/useSettingsStore';
import { Check, Mic, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

const VOICES: { name: VoiceName; desc: string; gender: string }[] = [
  { name: 'Kore', desc: 'Natural Female', gender: 'Female' },
  { name: 'Aoede', desc: 'Soft & Clear', gender: 'Female' },
  { name: 'Fenrir', desc: 'Deep Male', gender: 'Male' },
  { name: 'Puck', desc: 'Playful / Young', gender: 'Male' },
  { name: 'Charon', desc: 'Professional', gender: 'Male' },
  { name: 'Zephyr', desc: 'Warm / Expressive', gender: 'Female' },
];

export default function VoiceSelector() {
  const { selectedVoice, setSelectedVoice, voicePitch, setVoicePitch } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentVoice = VOICES.find(v => v.name === selectedVoice) || VOICES[0];

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          <Mic size={16} />
          <span>Neural Voice Model</span>
        </label>
        
        <div className="relative mt-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-[var(--border-glass)] bg-[var(--bg-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--text-secondary)] focus:outline-none"
          >
            <div className="flex flex-col">
              <span className="font-bold text-[var(--text-primary)]">{currentVoice.name}</span>
              <span className="text-xs text-[var(--text-secondary)]">{currentVoice.desc}</span>
            </div>
            {isOpen ? <ChevronUp size={20} className="text-[var(--text-secondary)]" /> : <ChevronDown size={20} className="text-[var(--text-secondary)]" />}
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-[var(--border-glass)] bg-[var(--bg-primary)] shadow-xl"
              >
                <div className="max-h-60 overflow-y-auto p-1">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.name}
                      onClick={() => {
                        setSelectedVoice(voice.name);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                        selectedVoice === voice.name
                          ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{voice.name}</span>
                        <span className={clsx("text-xs", selectedVoice === voice.name ? "text-[var(--text-on-accent)]/70" : "text-[var(--text-secondary)]")}>
                          {voice.desc}
                        </span>
                      </div>
                      {selectedVoice === voice.name && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          <span>Pitch Adjustment</span>
        </label>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-glass)] noise-overlay">
          <SlidersHorizontal size={16} className="text-[var(--text-secondary)]"/>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={voicePitch}
            onChange={(e) => setVoicePitch(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
          <span className="text-xs font-mono text-[var(--accent-primary)] w-8 text-right">
            {voicePitch > 0 ? '+' : ''}{voicePitch}
          </span>
        </div>
      </div>
    </div>
  );
}
