import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface ToastRef {
  show: (message: string) => void;
}

const Toast = forwardRef<ToastRef>((_, ref) => {
  const [message, setMessage] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    show: (msg: string) => {
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    },
  }));

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 right-8 z-50 flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-950/90 px-4 py-3 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] backdrop-blur-md"
        >
          <AlertCircle size={20} className="text-red-500" />
          <span className="font-medium">{message}</span>
          <button 
            onClick={() => setMessage(null)}
            className="ml-2 rounded-full p-1 hover:bg-red-900/50"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default Toast;
