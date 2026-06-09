// Central constants, route paths, and configuration for the Vault application.

export const APP_NAME = 'Vault';
export const APP_VERSION = 'v1.0.0';

export const ROUTES = {
  ROOT: '/',
  SETUP: '/setup',
  UNLOCK: '/unlock',
  RECOVER: '/recover',
  DASHBOARD: '/dashboard',
  NOTES: '/notes',
  GALLERY: '/gallery',
  FILES: '/files',
  PASSWORDS: '/passwords',
  CARDS: '/cards',
  DIARY: '/diary',
  SETTINGS: '/settings',
  STORAGE: '/storage',
  RESET_PASSWORD: '/reset-password',
};

export const ESSENTIALS_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: 'Home', path: ROUTES.DASHBOARD },
  { id: 'notes', label: 'Notes', icon: 'FileText', path: ROUTES.NOTES },
  { id: 'gallery', label: 'Gallery', icon: 'Images', path: ROUTES.GALLERY },
  { id: 'files', label: 'Files', icon: 'Folder', path: ROUTES.FILES },
  { id: 'passwords', label: 'Passwords', icon: 'Key', path: ROUTES.PASSWORDS },
  { id: 'cards', label: 'Cards', icon: 'CreditCard', path: ROUTES.CARDS },
  { id: 'diary', label: 'Diary', icon: 'BookOpen', path: ROUTES.DIARY },
];

export const SECURITY_NAV_ITEMS = [
  { id: 'settings', label: 'Settings', icon: 'Settings', path: ROUTES.SETTINGS },
  { id: 'storage', label: 'Storage', icon: 'HardDrive', path: ROUTES.STORAGE },
  { id: 'backup', label: 'Backup & Restore', icon: 'Database', path: '#', disabled: true },
];
