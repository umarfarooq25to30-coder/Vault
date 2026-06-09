import { useEffect } from 'react';

export function useKeyboardShortcuts(config = {}) {
  const { onSave, onNew, onEscape, onSearch } = config;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is interacting with inner application inputs
      // EXCEPT for certain shortcuts like Escape or Save where they WANT to save or blur.
      
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (onSave) {
          onSave(e);
        }
      }

      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        e.stopPropagation();
        if (onNew) {
          onNew(e);
        }
      }

      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        if (onSearch) {
          onSearch(e);
        }
      }

      if (e.key === 'Escape') {
        if (onEscape) {
          // If we want Esc to clear focus as well, we can check activeElement
          if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
             document.activeElement.blur();
          }
          // e.preventDefault();
          onEscape(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onNew, onEscape, onSearch]);
}
