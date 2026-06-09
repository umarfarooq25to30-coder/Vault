// Zustand store for managing UI options including dark/light theme, sidebar visibility, view layouts, page router state, and searches.

import { create } from 'zustand';

// Initial theme setup to prevent layout flash
const getInitialTheme = () => {
  const saved = localStorage.getItem('vault_theme');
  return saved || 'system';
};

const getInitialFolderViews = () => {
  try {
    const saved = localStorage.getItem('vault_folder_views');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export const useUiStore = create((set) => ({
  theme: getInitialTheme(),
  sidebarOpen: true, // we always keep it open on layout, but let collapsing handle the size/hiding!
  sidebarCollapsed: localStorage.getItem('vault_sidebar_collapsed') === 'true',
  viewMode: localStorage.getItem('vault_view_mode') || 'grid',
  folderViews: getInitialFolderViews(),
  storageLimit: parseFloat(localStorage.getItem('vault_storage_limit_gb')) || 5,
  currentPage: 'dashboard',
  searchQuery: '',

  toggleSidebarCollapsed: () => {
    set((state) => {
      const nextCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('vault_sidebar_collapsed', String(nextCollapsed));
      return { sidebarCollapsed: nextCollapsed };
    });
  },

  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('vault_sidebar_collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },

  setTheme: (theme) => {
    localStorage.setItem('vault_theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      let nextTheme;
      if (state.theme === 'light') {
        nextTheme = 'dark';
      } else if (state.theme === 'dark') {
        nextTheme = 'system';
      } else {
        nextTheme = 'light';
      }
      localStorage.setItem('vault_theme', nextTheme);
      return { theme: nextTheme };
    });
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  setViewMode: (mode) => {
    localStorage.setItem('vault_view_mode', mode);
    // When global view changes, clear specific overrides so ALL follow the main view
    localStorage.removeItem('vault_folder_views');
    set({ viewMode: mode, folderViews: {} });
  },

  setFolderView: (folderKey, mode) => {
    set((state) => {
      const nextViews = { ...state.folderViews, [folderKey]: mode };
      localStorage.setItem('vault_folder_views', JSON.stringify(nextViews));
      return { folderViews: nextViews };
    });
  },

  setStorageLimit: (limit) => {
    localStorage.setItem('vault_storage_limit_gb', String(limit));
    set({ storageLimit: limit });
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
}));
