import React, { useEffect } from 'react';
import { useDeleteConfirmStore } from '../../store/useDeleteConfirmStore';
import { FiTrash2 } from 'react-icons/fi';

export const DeleteConfirmPopup: React.FC = () => {
  const {
    isOpen,
    title,
    itemName,
    confirmLabel,
    cancelLabel,
    isProcessing,
    closeConfirm,
    executeConfirm,
  } = useDeleteConfirmStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeConfirm();
      } else if (e.key === 'Enter' && !isProcessing) {
        executeConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, closeConfirm, executeConfirm]);

  if (!isOpen) return null;

  // Ultra-clean headline: incorporates item name cleanly if present
  const displayTitle = itemName 
    ? `Delete "${itemName}"?` 
    : title || 'Delete this item?';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      className="fixed bottom-[calc(5rem+var(--sab))] sm:bottom-6 right-4 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in slide-in-from-bottom-3 fade-in duration-200"
    >
      <div className="bg-surface/95 dark:bg-[#141517]/95 backdrop-blur-xl border border-rose-500/25 dark:border-rose-500/30 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-2xl shadow-black/50 ring-1 ring-black/10 dark:ring-white/5 flex flex-wrap sm:flex-nowrap items-center gap-3 max-h-[calc(100dvh-6rem)] overflow-y-auto">
        {/* Minimal Icon Badge */}
        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <FiTrash2 size={14} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1 basis-40">
          <div id="delete-confirm-title" className="text-xs font-bold text-foreground break-words [overflow-wrap:anywhere]">
            {displayTitle}
          </div>
          <p className="text-[11px] text-muted break-words mt-0.5">
            This action cannot be undone.
          </p>
        </div>

        {/* Minimal Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={closeConfirm}
            disabled={isProcessing}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-secondary-text hover:text-foreground hover:bg-surface-secondary transition-colors cursor-pointer disabled:opacity-40"
          >
            {cancelLabel || 'Cancel'}
          </button>

          <button
            type="button"
            onClick={executeConfirm}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting</span>
              </>
            ) : (
              <span>{confirmLabel || 'Delete'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
