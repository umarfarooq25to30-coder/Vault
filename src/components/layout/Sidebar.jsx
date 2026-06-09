// Sidebar navigation tree showing app directories, active statuses, current storage indicators, and layout controllers.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Images, 
  Folder, 
  Key, 
  CreditCard, 
  BookOpen,  
  Settings, 
  Database,
  Grid,
  List,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  HardDrive
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useVaultStore } from '../../store/vaultStore';
import { useStorage } from '../../hooks/useStorage';
import { VaultFullLogo } from '../shared/VaultFullLogo';
import { ROUTES } from '../../constants';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);

  const { stats } = useStorage();
  const percentage = stats.percentage || 0.01;

  // Collapsible section states
  const [essentialsExpanded, setEssentialsExpanded] = useState(true);
  const [securityExpanded, setSecurityExpanded] = useState(true);

  // Width threshold listener to trigger auto-collapsing
  const lastWidthRef = useRef(window.innerWidth);
  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const lastWidth = lastWidthRef.current;
      
      if (currentWidth < 1024 && lastWidth >= 1024) {
        setSidebarCollapsed(true);
      } else if (currentWidth >= 1024 && lastWidth < 1024) {
        setSidebarCollapsed(false);
      }
      lastWidthRef.current = currentWidth;
    };
    
    // Initial load check
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  // Icon mapping helper
  const renderIcon = (iconName, className = 'w-4 h-4') => {
    const icons = {
      Home: <Home className={className} />,
      FileText: <FileText className={className} />,
      Images: <Images className={className} />,
      Folder: <Folder className={className} />,
      Key: <Key className={className} />,
      CreditCard: <CreditCard className={className} />,
      BookOpen: <BookOpen className={className} />,
      Settings: <Settings className={className} />,
      Database: <Database className={className} />,
      HardDrive: <HardDrive className={className} />,
    };
    return icons[iconName] || <Folder className={className} />;
  };

  const navItems = {
    essentials: [
      { id: 'dashboard', label: 'Home', icon: 'Home', path: ROUTES.DASHBOARD },
      { id: 'notes', label: 'Notes', icon: 'FileText', path: ROUTES.NOTES },
      { id: 'gallery', label: 'Gallery', icon: 'Images', path: ROUTES.GALLERY },
      { id: 'files', label: 'Files', icon: 'Folder', path: ROUTES.FILES },
      { id: 'passwords', label: 'Passwords', icon: 'Key', path: ROUTES.PASSWORDS },
      { id: 'cards', label: 'Cards', icon: 'CreditCard', path: ROUTES.CARDS },
      { id: 'diary', label: 'Diary', icon: 'BookOpen', path: ROUTES.DIARY },
    ],
    security: [
      { id: 'settings', label: 'Settings', icon: 'Settings', path: ROUTES.ROUTES_SETTINGS || ROUTES.SETTINGS },
      { id: 'storage', label: 'Storage', icon: 'HardDrive', path: ROUTES.STORAGE },
      { id: 'backup', label: 'Backup & Restore', icon: 'Database', path: '#', disabled: true },
    ],
  };

  // Safe navigation handler
  const handleNavigation = (path, disabled) => {
    if (disabled || path === '#') return;
    navigate(path);
  };

  if (!sidebarOpen) return null;

  if (sidebarCollapsed) {
    return (
      <aside className="w-14 h-full bg-[#F5F5F5] dark:bg-[#1C1C1C] flex flex-col flex-shrink-0 select-none transition-all duration-300">
        {/* Collapsed Brand Icon & Toggle Button */}
        <div className="p-4 flex flex-col items-center gap-4">
          <VaultFullLogo 
            onlyIcon={true}
            className="h-6 w-6 text-[#1A1A1A] dark:text-[#F0F0F0] cursor-pointer flex-shrink-0" 
            onClick={() => setSidebarCollapsed(false)}
            title="Expand Vault"
          />
          <button 
            onClick={toggleSidebarCollapsed}
            className="p-1 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsed Search Icon Trigger Button */}
        <div className="px-3 mb-4 flex justify-center">
          <button 
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded-lg text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center animate-none"
            title="Search (Expand sidebar)"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Centered navigation items for collapsed view mode */}
        <nav className="flex-1 overflow-y-auto px-1 space-y-1 sidebar-scroll flex flex-col items-center custom-scrollbar">
          {navItems.essentials.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.disabled)}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg select-none transition-all duration-150 cursor-pointer relative group
                  ${isActive 
                    ? 'bg-white text-[#1A1A1A] dark:bg-[#1E1E1E] dark:text-white' 
                    : 'text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-white'
                  }
                `}
                title={item.label}
              >
                {renderIcon(item.icon, 'w-5 h-5')}
                {/* Floating pure-CSS context tooltip on hover */}
                <div className="absolute left-14 px-2.5 py-1.5 rounded-md bg-[#1A1A1A] dark:bg-[#282828] text-white dark:text-[#F0F0F0] text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  {item.label}
                </div>
              </button>
            );
          })}

          <div className="h-4" /> {/* Non-border vertical spacing separator */}

          {navItems.security.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.disabled)}
                disabled={item.disabled}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg select-none transition-all duration-150 relative group
                  ${item.disabled 
                    ? 'opacity-40 cursor-not-allowed text-[#9b9b9b] dark:text-[#888888]' 
                    : isActive 
                      ? 'bg-white text-[#1A1A1A] dark:bg-[#1E1E1E] dark:text-white' 
                      : 'text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-white cursor-pointer'
                  }
                `}
                title={item.label}
              >
                {renderIcon(item.icon, 'w-5 h-5')}
                <div className="absolute left-14 px-2.5 py-1.5 rounded-md bg-[#1A1A1A] dark:bg-[#282828] text-white dark:text-[#F0F0F0] text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  {item.label}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Collapsed small footer sections utilizing background contrast separation */}
        <div className="bg-[#EBEBEB] dark:bg-[#181818] flex flex-col items-center py-4 gap-3">
          <div 
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] font-semibold text-[13px] tracking-wide cursor-pointer hover:opacity-80 transition-opacity"
            title="My Vault Settings"
          >
            V
          </div>
          <div className="w-8 h-1 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full overflow-hidden" title={`Storage: ${percentage}% used`}>
            <div 
              className="h-full bg-[#1A1A1A] dark:bg-[#F0F0F0] transition-all" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[220px] h-full bg-[#F5F5F5] dark:bg-[#1C1C1C] flex flex-col flex-shrink-0 select-none transition-all duration-300">
      {/* Title logo and action bar */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center text-[#1A1A1A] dark:text-[#F0F0F0]">
          <VaultFullLogo className="h-6 w-auto text-[#1A1A1A] dark:text-[#F0F0F0] -ml-1.5" />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer" title="Add New Item">
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
            title={`Toggle layout (currently ${viewMode})`}
          >
            {viewMode === 'grid' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>
          <button 
            onClick={toggleSidebarCollapsed}
            className="p-1 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] rounded text-[#6B6B6B] dark:text-[#888888] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded Sidebar Search */}
      <div className="px-3 mb-4">
        <div className="relative flex items-center bg-white dark:bg-black rounded-lg px-2.5 py-1.5 transition-all duration-150">
          <Search className="w-3.5 h-3.5 text-[#9B9B9B] dark:text-[#888888] ml-0.5" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-[#1A1A1A] dark:text-[#F0F0F0] ml-2 w-full outline-none placeholder-[#9B9B9B] dark:placeholder-[#888888]"
          />
          <span className="ml-auto text-[9px] text-[#9B9B9B] dark:text-[#888888] font-bold select-none cursor-default">Ctrl+F</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-4 sidebar-scroll custom-scrollbar">
        {/* Essentials Group */}
        <div>
          <button 
            onClick={() => setEssentialsExpanded(!essentialsExpanded)}
            className="w-full flex justify-between items-center text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] px-3 mb-1.5 tracking-wider hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>Essentials</span>
            <ChevronDown 
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                essentialsExpanded ? 'rotate-0' : '-rotate-90'
              }`} 
            />
          </button>
          
          <div 
            className={`space-y-0.5 transition-all duration-200 overflow-hidden ${
              essentialsExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            {navItems.essentials.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path, item.disabled)}
                  className={`
                    w-full flex items-center h-9 px-3 rounded-lg text-sm select-none transition-all duration-150 cursor-pointer
                    ${isActive 
                      ? 'bg-white text-[#1A1A1A] font-semibold dark:bg-[#1E1E1E] dark:text-white' 
                      : 'text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-white'
                    }
                  `}
                >
                  <span className="mr-3 text-inherit transition-all duration-150">{renderIcon(item.icon)}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security Group */}
        <div>
          <button 
            onClick={() => setSecurityExpanded(!securityExpanded)}
            className="w-full flex justify-between items-center text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] px-3 mb-1.5 tracking-wider hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>Security</span>
            <ChevronDown 
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                securityExpanded ? 'rotate-0' : '-rotate-90'
              }`} 
            />
          </button>
          
          <div 
            className={`space-y-0.5 transition-all duration-200 overflow-hidden ${
              securityExpanded ? 'max-h-[150px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            {navItems.security.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path, item.disabled)}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center h-9 px-3 rounded-lg text-sm select-none transition-all duration-150
                    ${item.disabled 
                      ? 'opacity-40 cursor-not-allowed text-[#9b9b9b] dark:text-[#888888]' 
                      : isActive 
                        ? 'bg-white text-[#1A1A1A] font-semibold dark:bg-[#1E1E1E] dark:text-white' 
                        : 'text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-white cursor-pointer'
                    }
                  `}
                >
                  <span className="mr-3 text-inherit transition-all duration-150">{renderIcon(item.icon)}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Profile + Storage sections at bottom: separated by clean background contrasts */}
      <div className="bg-[#EBEBEB] dark:bg-[#181818]">
        {/* SMALL USER BAR PROFILE AREA */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F5F5F5] dark:bg-[#1C1C1C]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] font-semibold text-[13px] tracking-wide">
              V
            </div>
            <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#F0F0F0]">
              My Vault
            </span>
          </div>
          <button 
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="group p-1 text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] focus:outline-none cursor-pointer"
            title="Vault Settings"
          >
            <Settings className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>

        {/* STORAGE BAR */}
        <div className="p-4">
          <div className="flex justify-between text-[11px] text-[#6B6B6B] dark:text-[#888888] mb-1 font-medium">
            <span>Storage Used</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1A1A1A] dark:bg-[#F0F0F0] transition-all" 
              style={{ width: `${percentage}%`, transition: 'width 1000ms cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </div>
          <p className="text-[10px] text-[#9B9B9B] dark:text-[#888888] mt-1.5 font-normal">{stats.formattedSize} used of {stats.formattedQuota || 'unlimited'} device capacity</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
