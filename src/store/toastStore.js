// Zustand store for managing on-device toast notifications and alarm displays inside the preview environment.

import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = toast.id || Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      variant: toast.variant || 'info', // 'warning' | 'danger' | 'info' | 'success'
      title: toast.title || '',
      description: toast.description || '',
      duration: toast.duration !== undefined ? toast.duration : 5000,
      persistent: toast.persistent || false,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));
