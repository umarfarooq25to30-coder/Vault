// Reusable Card panel container featuring modular layout, clean 12px borders, hover effects, and strict dark-mode colors.

import React from 'react';

export function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) {
  const isClickable = !!onClick || hoverable;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-[#1E1E1E]
        rounded-xl p-5 transition-all duration-150
        ${isClickable ? 'cursor-pointer hover:bg-[#F5F5F5] dark:hover:bg-[#252525]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-[15px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }) {
  return <p className={`text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 ${className}`}>{children}</p>;
}

export default Card;
