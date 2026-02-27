import { motion, AnimatePresence } from 'motion/react';
import { Mic2, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-cyber-black)] noise-overlay"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-[var(--color-neon-cyan-dim)] text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30 shadow-[0_0_60px_var(--accent-dim)]">
          <Mic2 size={64} />
          
          {/* Scanning Line Animation */}
          <motion.div
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-[var(--color-neon-cyan)] shadow-[0_0_10px_var(--color-neon-cyan)]"
          />
        </div>

        <div className="text-center">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-[var(--color-text-primary)] tracking-widest uppercase mb-2"
          >
            AI Audio Studio
          </motion.h1>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-3 text-[var(--color-neon-cyan)]"
          >
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono uppercase tracking-[0.2em]">Neural Processing...</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
