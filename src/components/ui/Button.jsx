// Reusable fully-styled UI Button component supporting custom actions, styles, and hover states.

import React from 'react';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  fullWidth = false,
  className = '',
  icon: Icon = null,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-[#1A1A1A] hover:bg-[#333333] text-white dark:bg-[#F0F0F0] dark:hover:bg-white dark:text-[#1A1A1A]',
    secondary: 'bg-[#EEEEEE] hover:bg-[#E0E0E0] text-[#1A1A1A] dark:bg-[#252525] dark:hover:bg-[#333333] dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600',
    outline: 'bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#1a1a1a] dark:bg-[#222222] dark:hover:bg-[#2C2C2C] dark:text-[#F0F0F0]',
    ghost: 'bg-transparent hover:bg-[#EEEEEE] text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:bg-[#252525] dark:text-[#888888] dark:hover:text-white',
  };

  const sizeClasses = {
    sm: 'text-xs h-8 px-3 gap-1.5',
    md: 'text-sm h-10 px-4 gap-2',
    lg: 'text-base h-12 px-6 gap-2.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
export default Button;
