// UI component representing alert notifications, warnings, Success, and Danger errors stacking gracefully at the bottom right.

import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

export function Toast({ id, variant, title, description, duration, persistent }) {
  const removeToast = useToastStore((state) => state.removeToast);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss and timer progress
  useEffect(() => {
    if (persistent) return;

    const intervalTime = 50; // Update every 50ms for smooth transition
    const steps = duration / intervalTime;
    const decrement = 100 / steps;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressTimer);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    const dismissTimer = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(dismissTimer);
    };
  }, [id, duration, persistent, removeToast]);

  // Color theme mapping based on variant
  // Variant options: 'warning' | 'danger' | 'info' | 'success'
  const configs = {
    warning: {
      bg: 'bg-amber-50/90 dark:bg-amber-950/20',
      border: '',
      iconClass: 'text-amber-650 dark:text-amber-400',
      icon: AlertTriangle,
      progressBarClass: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-red-50/90 dark:bg-red-950/20',
      border: '',
      iconClass: 'text-red-650 dark:text-red-450',
      icon: AlertOctagon,
      progressBarClass: 'bg-red-500',
    },
    success: {
      bg: 'bg-emerald-50/90 dark:bg-emerald-950/20',
      border: '',
      iconClass: 'text-emerald-650 dark:text-emerald-400',
      icon: CheckCircle2,
      progressBarClass: 'bg-emerald-500',
    },
    info: {
      bg: 'bg-blue-50/90 dark:bg-blue-950/20',
      border: '',
      iconClass: 'text-blue-650 dark:text-blue-400',
      icon: Info,
      progressBarClass: 'bg-blue-500',
    },
  };

  const currentConfig = configs[variant] || configs.info;
  const IconComponent = currentConfig.icon;

  return (
    <div
      id={`toast-${id}`}
      className={`w-[320px] rounded-xl flex flex-col overflow-hidden transform transition-all duration-300 ease-out translate-y-0 opacity-100 ${currentConfig.bg} ${currentConfig.border}`}
    >
      <div className="p-4 flex gap-3 relative">
        <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${currentConfig.iconClass}`} />
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="text-[13px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
            {title}
          </h4>
          {description && (
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#888888] mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <button
          onClick={() => removeToast(id)}
          className="absolute top-3 right-3 text-[#9B9B9B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors p-1 rounded-md hover:bg-[#EEEEEE] dark:hover:bg-[#252525]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {!persistent && (
        <div className="w-full bg-[#EEEEEE] dark:bg-[#252525] h-1 mt-auto">
          <div
            className={`h-full transition-all duration-50 linear ${currentConfig.progressBarClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-h-[85vh] overflow-y-auto pointer-events-auto p-2"
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  );
}
