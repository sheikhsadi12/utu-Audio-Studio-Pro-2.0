import React, { useState } from 'react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
  itemType?: string;
}

export default function RenameModal({ isOpen, onClose, onRename, currentName, itemType = 'file' }: RenameModalProps) {
  const [newName, setNewName] = useState(currentName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onRename(newName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-cyber-black)] p-6 shadow-xl">
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Rename {itemType}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Enter a new name for the {itemType}.</p>
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-bg-hover)] px-3 py-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:border-[var(--color-neon-cyan)] focus:outline-none"
            autoFocus
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-glass-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-neon-cyan)] px-4 py-2 text-sm font-bold text-[var(--color-text-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
