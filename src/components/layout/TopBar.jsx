// TopBar header component shown inside main layouts. Renders active titles, dynamic search inputs, theme custom toggles, and safe locking controls.

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, Grid, List, Menu, Sun, Moon, Laptop, Lock, LogOut } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useVaultStore } from '../../store/vaultStore';
import { ROUTES } from '../../constants';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Ui State selectors
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  // Vault State lock triggers
  const lockVault = useVaultStore((state) => state.lockVault);

  const handleLockVault = () => {
    lockVault();
    navigate(ROUTES.UNLOCK, { replace: true });
  };

  // Dynamic Page Title helper based on current route path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('notes')) return 'Notes';
    if (path.includes('gallery')) return 'Gallery';
    if (path.includes('files')) return 'Files';
    if (path.includes('passwords')) return 'Passwords';
    if (path.includes('cards')) return 'Cards';
    if (path.includes('diary')) return 'Diary';
    if (path.includes('settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="h-16 bg-white dark:bg-[#1E1E1E] px-6 flex items-center justify-between select-none">
      {/* Page Title & Hamburger for Responsive collapse */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded-md text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white md:hidden cursor-pointer focus:outline-none"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-[#1A1A1A] dark:text-[#F0F0F0]">
          {getPageTitle()}
        </h1>
      </div>

      {/* Interactive Controls (Search + Filters + Theme + Lock) */}
      <div className="flex items-center gap-3">
        {/* wider search block with custom focus rings */}
        <div className="relative flex items-center bg-[#FAFAFA] dark:bg-[#141414] rounded-lg px-3 py-2 w-[240px] focus-within:bg-white dark:focus-within:bg-[black] transition-all">
          <Search className="w-3.5 h-3.5 text-[#9B9B9B] dark:text-[#888888]" />
          <input
            type="text"
            placeholder="Search in vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs ml-2 w-full outline-none text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#888888] select-text"
          />
        </div>

        {/* Action triggers */}
        <button 
          className="p-2 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer focus:outline-none"
          title="Filter Items"
        >
          <Filter className="w-4 h-4" />
        </button>
        
        <button 
          className="p-2 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer focus:outline-none"
          title="Sort Order"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        {/* View Mode Grid/List toggle */}
        <div className="flex bg-[#F5F5F5] dark:bg-[#252525] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer focus:outline-none ${viewMode === 'grid' ? 'bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-white font-semibold' : 'text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525]/50'}`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer focus:outline-none ${viewMode === 'list' ? 'bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-white font-semibold' : 'text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525]/50'}`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* MORPHING THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className="p-2 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-all cursor-pointer focus:outline-none"
          title={`Theme: ${theme === 'light' ? 'Light Mode (Click to switch to Dark)' : theme === 'dark' ? 'Dark Mode (Click to switch to System Auto)' : 'System Auto (Click to switch to Light)'}`}
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            {theme === 'light' ? (
              <Sun className="w-4 h-4 transition-all duration-300" />
            ) : theme === 'dark' ? (
              <Moon className="w-4 h-4 transition-all duration-300" />
            ) : (
              <Laptop className="w-4 h-4 transition-all duration-300" />
            )}
          </div>
        </button>

        {/* SECURE CIRCULAR LOCK ACTION */}
        <button
          onClick={handleLockVault}
          className="w-9 h-9 flex items-center justify-center bg-[#F5F5F5] dark:bg-[#252525] rounded-full text-[#EF4444] dark:text-red-450 hover:bg-[#EEEEEE] dark:hover:bg-[#333333] transition-all cursor-pointer focus:outline-none active:scale-95"
          title="Securely Lock Vault"
        >
          <LogOut className="w-4 h-4 stroke-[2]" />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
