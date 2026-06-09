// Search input component designed with custom shortcuts (Cmd+F triggers autofocus), clear active states, and custom widths.

import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  width = 'w-full',
  onClear,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // CMD+F or CTRL+F triggers focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className={`relative flex items-center bg-white dark:bg-[#1E1E1E] rounded-lg px-3 py-1.5 transition-all duration-150 ${width} ${className}`}>
      <Search className="w-3.5 h-3.5 text-[#9B9B9B] dark:text-[#888888] flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent text-xs text-[#1A1A1A] dark:text-[#F0F0F0] ml-2 pr-6 outline-none placeholder-[#9B9B9B] dark:placeholder-[#888888]"
      />
      {value ? (
        <button
          onClick={onClear}
          className="absolute right-2 p-0.5 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded text-[#6B6B6B] dark:text-[#888888] cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      ) : (
        <span className="absolute right-3 text-[10px] text-[#9B9B9B] dark:text-[#888888] font-semibold select-none">
          Ctrl+F
        </span>
      )}
    </div>
  );
}

export default SearchBar;
