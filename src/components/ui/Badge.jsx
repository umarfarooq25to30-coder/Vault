// Reusable Badge pill component with 6px rounded edges for tags, item counters, status indicators, and category trackers.

import React from 'react';

export function Badge({
  children,
  variant = 'default', // 'default' | 'dark' | 'success' | 'warning' | 'error'
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md transition-colors select-none';

  const variantClasses = {
    default: 'bg-[#EEEEEE] dark:bg-[#252525] text-[#6B6B6B] dark:text-[#888888]',
    dark: 'bg-[#1A1A1A] text-white dark:bg-[#F0F0F0] dark:text-[#1A1A1A]',
    success: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300',
    warning: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
    error: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-350',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
