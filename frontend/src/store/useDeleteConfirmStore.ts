import { create } from 'zustand';

export interface DeleteConfirmOptions {
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

interface DeleteConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel: string;
  cancelLabel: string;
  isProcessing: boolean;
  onConfirmCallback: (() => Promise<void> | void) | null;

  promptDelete: (options: DeleteConfirmOptions) => void;
  closeConfirm: () => void;
  executeConfirm: () => Promise<void>;
}

export const useDeleteConfirmStore = create<DeleteConfirmState>((set, get) => ({
  isOpen: false,
  title: 'Confirm Deletion',
  message: 'Are you sure you want to delete this? This action cannot be undone.',
  itemName: undefined,
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  isProcessing: false,
  onConfirmCallback: null,

  promptDelete: (options) => {
    set({
      isOpen: true,
      title: options.title || 'Confirm Deletion',
      message: options.message || 'Are you sure you want to delete this? This action cannot be undone.',
      itemName: options.itemName,
      confirmLabel: options.confirmLabel || 'Delete',
      cancelLabel: options.cancelLabel || 'Cancel',
      isProcessing: false,
      onConfirmCallback: () => options.onConfirm(),
    });
  },

  closeConfirm: () => {
    if (get().isProcessing) return;
    set({ isOpen: false, onConfirmCallback: null, isProcessing: false });
  },

  executeConfirm: async () => {
    const callback = get().onConfirmCallback;
    if (!callback) {
      set({ isOpen: false });
      return;
    }

    try {
      set({ isProcessing: true });
      await callback();
      set({ isOpen: false, onConfirmCallback: null, isProcessing: false });
    } catch (err) {
      console.error('Delete action failed:', err);
      set({ isProcessing: false });
    }
  },
}));
