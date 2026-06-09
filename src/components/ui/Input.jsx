// Reusable fully-styled form Input component supporting states like error, focused, and password show/hide.

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  fullWidth = true,
  className = '',
  disabled = false,
  hint,
  icon: Icon = null,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={`flex flex-col gap-1.5 ${widthClass} ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[#6B6B6B] dark:text-[#888888] select-none">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-[#9B9B9B] pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-10 text-sm rounded-lg bg-[#F5F5F5] dark:bg-[#222222]
            focus:bg-[#EFEFEF] dark:focus:bg-[#282828]
            text-[#1A1A1A] dark:text-[#F0F0F0]
            placeholder-[#9B9B9B] dark:placeholder-[#888888]
            outline-none transition-all duration-150
            ${Icon ? 'pl-9' : 'pl-3'}
            ${isPassword ? 'pr-10' : 'pr-3'}
            ${error ? 'bg-red-50 dark:bg-red-950/20 text-red-650' : ''}
            disabled:opacity-50 disabled:bg-[#EEEEEE] dark:disabled:bg-zinc-800
            w-full
          `}
          {...props}
        />

        {isPassword && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#888888] dark:hover:text-white transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <span className="text-xs text-red-500 font-medium">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[#9B9B9B] dark:text-[#888888]">{hint}</span>
      ) : null}
    </div>
  );
}

export default Input;
