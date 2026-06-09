// Core Layout wrapper implementing the Three-Column layout grid supporting Icon Rails, directory trees, Header controls, and page panels.

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Database, 
  ArrowLeftRight, 
  BarChart3, 
  Sun, 
  Moon, 
  Laptop,
  Lock 
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useVault } from '../../hooks/useVault';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ROUTES } from '../../constants';

export function MainContent({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const { lockVault } = useVault();
  const [hoveredIcon, setHoveredIcon] = useState(null);

  const railItems = [
    { id: 'dashboard', label: 'Home', icon: Home, path: ROUTES.DASHBOARD },
    { id: 'files', label: 'Database', icon: Database, path: ROUTES.FILES },
    { id: 'passwords', label: 'Passwords', icon: ArrowLeftRight, path: ROUTES.PASSWORDS },
    { id: 'settings', label: 'Analytics', icon: BarChart3, path: ROUTES.SETTINGS },
  ];

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen w-screen bg-[#FAFAFA] dark:bg-[#141414] font-sans text-[#1A1A1A] dark:text-[#F0F0F0] overflow-hidden">
      
      {/* COLUMN 1: LEFT ICON RAIL (48px wide) */}
      <aside className="w-12 h-full bg-[#EFEFEF] dark:bg-[#181818] flex flex-col items-center py-4 justify-between flex-shrink-0 z-10 select-none">
        {/* Navigation Group */}
        <div className="flex flex-col gap-6 items-center">
          {railItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <div 
                key={item.id}
                className="relative flex items-center justify-center cursor-pointer group"
                onMouseEnter={() => setHoveredIcon(item.id)}
                onMouseLeave={() => setHoveredIcon(null)}
                onClick={() => navigate(item.path)}
              >
                {/* Tooltip */}
                {hoveredIcon === item.id && (
                  <div className="absolute left-14 px-2 py-1 rounded bg-[#1A1A1A] text-white text-[10px] font-semibold tracking-wide whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
                
                {/* Icon wrapper */}
                <div 
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-white text-[#1A1A1A] dark:bg-[#1E1E1E] dark:text-[#F0F0F0] font-semibold' 
                      : 'text-[#888888] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0]'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer controls: Theme and Lock actions */}
        <div className="flex flex-col gap-6 items-center">
          {/* Theme Switcher Toggle */}
          <div 
            className="relative flex items-center justify-center cursor-pointer group"
            onMouseEnter={() => setHoveredIcon('theme')}
            onMouseLeave={() => setHoveredIcon(null)}
            onClick={toggleTheme}
          >
            {hoveredIcon === 'theme' && (
              <div className="absolute left-14 px-2 py-1 rounded bg-[#1A1A1A] text-white text-[10px] font-semibold tracking-wide whitespace-nowrap z-50">
                {theme === 'light' ? 'Theme: Light' : theme === 'dark' ? 'Theme: Dark' : 'Theme: System'}
              </div>
            )}
            <div className="p-2 text-[#888888] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 stroke-[1.8]" />
              ) : theme === 'dark' ? (
                <Moon className="w-5 h-5 stroke-[1.8]" />
              ) : (
                <Laptop className="w-5 h-5 stroke-[1.8]" />
              )}
            </div>
          </div>

          {/* Secure Lock action */}
          <div 
            className="relative flex items-center justify-center cursor-pointer group"
            onMouseEnter={() => setHoveredIcon('lock')}
            onMouseLeave={() => setHoveredIcon(null)}
            onClick={lockVault}
          >
            {hoveredIcon === 'lock' && (
              <div className="absolute left-14 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap z-50">
                Lock Vault
              </div>
            )}
            <div className="p-2 text-red-500 hover:text-red-600 transition-colors">
              <Lock className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>
        </div>
      </aside>

      {/* COLUMN 2: CENTER SIDEBAR (220px wide) */}
      <Sidebar />

      {/* COLUMN 3: RIGHT MAIN CONTENT AREA */}
      <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden bg-[#FAFAFA] dark:bg-[#141414]">
        {/* Context Top bar */}
        <TopBar />

        {/* Dynamic page container */}
        <div className="flex-1 p-6 overflow-y-auto app-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainContent;
