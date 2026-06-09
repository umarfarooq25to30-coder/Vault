// Reusable fully accessible modal dialog wrapper with a background overlay, clean animations, and 16px border radius.

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md', // 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl'
  className = '',
  closeOnOverlayClick = true,
}) {
  // Listen for Escape key press to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
    >
      <div
        className={`
          w-full bg-white dark:bg-[#1E1E1E]
          rounded-2xl flex flex-col overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
          ${maxWidth} ${className}
        `}
      >
        {/* Header: Zero borders, separated by beautiful background contrast padding */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 dark:bg-zinc-900/40">
          <h2 className="text-base font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded-md text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#888888] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto select-text">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
