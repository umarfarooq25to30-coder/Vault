import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, Grid, List, Menu, Sun, Moon, Laptop, Lock, LogOut, FileText, Image as ImageIcon, File, Key, CreditCard, BookOpen, Mic, X, Clock } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useVaultStore } from '../../store/vaultStore';
import { ROUTES } from '../../constants';
import { getAllItems } from '../../db/vaultOperations';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Ui State selectors
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  // Vault State lock triggers
  const lockVault = useVaultStore((state) => state.lockVault);
  const derivedKey = useVaultStore((state) => state.derivedKey);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchType, setGlobalSearchType] = useState('all');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const modalInputRef = useRef(null);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('vault_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (item) => {
    setRecentSearches((prev) => {
      const newRecent = [item, ...prev.filter(i => i.id !== item.id)].slice(0, 5);
      localStorage.setItem('vault_recent_searches', JSON.stringify(newRecent));
      return newRecent;
    });
  };

  const removeRecentSearch = (e, id) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const newRecent = prev.filter(i => i.id !== id);
      localStorage.setItem('vault_recent_searches', JSON.stringify(newRecent));
      return newRecent;
    });
  };

  const handleLockVault = () => {
    lockVault();
    navigate(ROUTES.UNLOCK, { replace: true });
  };

  useEffect(() => {
    if (isGlobalSearchOpen && modalInputRef.current) {
      setTimeout(() => modalInputRef.current.focus(), 50);
    }
  }, [isGlobalSearchOpen]);

  useEffect(() => {
    const query = globalSearchQuery.trim();
    if (!query || !derivedKey || !isGlobalSearchOpen) {
      setGlobalSearchResults([]);
      return;
    }

    let isMounted = true;
    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const { items } = await getAllItems(derivedKey, { 
          searchQuery: query, 
          type: globalSearchType === 'all' ? undefined : globalSearchType,
          limit: 30 
        });
        if (isMounted) {
          setGlobalSearchResults(items);
        }
      } catch(err) {
         // handle
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };
    
    const timeout = setTimeout(fetchResults, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    }
  }, [globalSearchQuery, globalSearchType, derivedKey, isGlobalSearchOpen]);

  // Handle Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen]);

  const getIconForType = (type) => {
    switch (type) {
      case 'note': return <FileText className="w-5 h-5" />;
      case 'photo': return <ImageIcon className="w-5 h-5" />;
      case 'file': return <File className="w-5 h-5" />;
      case 'password': return <Key className="w-5 h-5" />;
      case 'card': return <CreditCard className="w-5 h-5" />;
      case 'diary': return <BookOpen className="w-5 h-5" />;
      case 'voice': return <Mic className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const navigateToItem = (item) => {
    saveRecentSearch(item);
    setIsGlobalSearchOpen(false);
    setGlobalSearchQuery('');
    switch (item.type) {
      case 'note': navigate(ROUTES.NOTES); break;
      case 'photo': navigate(ROUTES.GALLERY); break;
      case 'file': navigate(ROUTES.FILES); break;
      case 'password': navigate(ROUTES.PASSWORDS); break;
      case 'card': navigate(ROUTES.CARDS); break;
      case 'diary': navigate(ROUTES.DIARY); break;
      case 'voice': navigate(ROUTES.VOICE); break;
      default: break;
    }
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
    if (path.includes('voice')) return 'Voice Notes';
    if (path.includes('settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-[#1E1E1E] px-6 flex items-center justify-between select-none relative z-40">
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
          {/* Header Search Button */}
          <button 
            type="button"
            onClick={() => setIsGlobalSearchOpen(true)}
            className="relative flex items-center bg-[#F5F5F5] dark:bg-[#141414] hover:bg-[#EEEEEE] dark:hover:bg-[#222222] rounded-lg px-3 py-2 w-[280px] transition-colors cursor-pointer border border-transparent dark:border-[#2A2A2A]"
          >
            <Search className="w-3.5 h-3.5 text-[#9B9B9B] dark:text-[#888888]" />
            <span className="text-xs ml-2 text-[#9B9B9B] dark:text-[#888888]">
              Global search...
            </span>
          </button>

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

          <button
            onClick={handleLockVault}
            className="w-9 h-9 flex items-center justify-center bg-[#F5F5F5] dark:bg-[#252525] rounded-full text-[#EF4444] dark:text-red-450 hover:bg-[#EEEEEE] dark:hover:bg-[#333333] transition-all cursor-pointer focus:outline-none active:scale-95"
            title="Securely Lock Vault"
          >
            <LogOut className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* FULLSCREEN SEARCH MODAL OVERLAY */}
      {isGlobalSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center pt-[10vh] px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-3xl flex flex-col h-[80vh]">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-[#9B9B9B] dark:text-[#555555]" />
              <input
                ref={modalInputRef}
                type="text"
                placeholder="Search everything in your vault..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#111111] border border-[#EEEEEE] dark:border-[#333333] rounded-2xl shadow-xl pl-20 pr-16 py-6 text-[24px] text-[#1A1A1A] dark:text-[#F0F0F0] outline-none placeholder-[#9B9B9B] dark:placeholder-[#666666] selection:bg-[#444444] selection:text-white"
              />
              <button
                onClick={() => setIsGlobalSearchOpen(false)}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#F0F0F0] dark:hover:bg-[#222222] text-[#9B9B9B] dark:text-[#888888] transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-2 mt-4 px-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                { id: 'all', label: 'All' },
                { id: 'note', label: 'Notes' },
                { id: 'password', label: 'Passwords' },
                { id: 'file', label: 'Files' },
                { id: 'photo', label: 'Photos' },
                { id: 'card', label: 'Cards' },
                { id: 'diary', label: 'Diary' },
                { id: 'voice', label: 'Voice Notes' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setGlobalSearchType(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer ${globalSearchType === cat.id ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-black font-medium border border-transparent' : 'bg-white dark:bg-[#111111] text-[#6B6B6B] dark:text-[#AAAAAA] hover:bg-[#F5F5F5] dark:hover:bg-[#222222] border border-[#EEEEEE] dark:border-[#333333]'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto w-full max-w-3xl custom-scrollbar px-2 pb-10">
              {!globalSearchQuery.trim() ? (
                recentSearches.length > 0 ? (
                  <div className="mt-4">
                    <div className="px-2 mb-4 text-[14px] font-medium text-[#888888] dark:text-[#666666] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Recent Searches</span>
                      </div>
                      <button 
                        onClick={() => {
                          setRecentSearches([]);
                          localStorage.removeItem('vault_recent_searches');
                        }}
                        className="text-xs hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((item) => (
                        <div 
                          key={`recent-${item.id}`}
                          onClick={() => navigateToItem(item)}
                          className="flex items-center gap-4 p-4 bg-white/50 dark:bg-[#151515]/50 border border-[#EEEEEE] dark:border-[#222222] hover:bg-[#FAFAFA] dark:hover:bg-[#202020] rounded-xl cursor-pointer transition-all shadow-sm group"
                        >
                          <div className="p-2 bg-[#F5F5F5] dark:bg-[#111111] rounded-lg text-[#888888] dark:text-[#AAAAAA]">
                            {getIconForType(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[16px] font-medium text-[#1A1A1A] dark:text-[#F0F0F0] truncate">
                              {item.title}
                            </p>
                            <p className="text-[12px] text-[#6B6B6B] dark:text-[#888888] capitalize mt-0.5">
                              {item.type} &bull; {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => removeRecentSearch(e, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[#E5E5E5] dark:hover:bg-[#333333] rounded-md text-[#9B9B9B] dark:text-[#666666] transition-all"
                            title="Remove from history"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center mt-20 text-[#9B9B9B] dark:text-[#666666]">
                    <p className="text-[18px]">Type to start searching your vault</p>
                    <p className="text-[14px] mt-2 opacity-80">Passwords, Notes, Photos, Files, Diary, Voice</p>
                  </div>
                )
              ) : isSearching ? (
                <div className="text-center mt-10 text-[#6B6B6B] dark:text-[#888888] text-[16px]">
                  Searching...
                </div>
              ) : globalSearchResults.length > 0 ? (
                <div className="space-y-3">
                  {globalSearchResults.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => navigateToItem(item)}
                      className="flex items-center gap-5 p-5 bg-white dark:bg-[#181818] border border-[#EEEEEE] dark:border-[#222222] hover:border-[#CCCCCC] dark:hover:border-[#444444] hover:bg-[#FAFAFA] dark:hover:bg-[#202020] rounded-xl cursor-pointer transition-all shadow-sm"
                    >
                      <div className="p-3 bg-[#FAFAFA] dark:bg-[#111111] rounded-lg text-[#888888] dark:text-[#AAAAAA]">
                        {getIconForType(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[18px] font-medium text-[#1A1A1A] dark:text-[#F0F0F0] truncate">
                          {item.title}
                        </p>
                        <p className="text-[14px] text-[#6B6B6B] dark:text-[#888888] capitalize mt-1">
                          {item.type} &bull; {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center mt-20 text-[#6B6B6B] dark:text-[#888888]">
                  <p className="text-[18px]">No matching items found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TopBar;
