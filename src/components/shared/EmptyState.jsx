// Visual layout component displayed when database queries are empty or when search queries yield zero matches.

import React from 'react';
import { Button } from '../ui/Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-xl bg-white dark:bg-[#1E1E1E] ${className}`}>
      {Icon && (
        <div className="p-4 bg-[#F5F5F5] dark:bg-[#252525] rounded-full text-[#1A1A1A] dark:text-[#F0F0F0] mb-4">
          <Icon className="w-12 h-12" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-medium text-[#1A1A1A] dark:text-[#F0F0F0] mb-1">{title}</h3>
      <p className="text-sm text-[#6B6B6B] dark:text-[#888888] max-w-sm mb-5">{description}</p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
