// Home dashboard displaying responsive shortcut portals, quick-access folders, and offline status metrics.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Images, 
  Folder, 
  Key, 
  CreditCard, 
  BookOpen, 
  FolderOpen,
  ArrowRight,
  Shield,
  Clock,
  HardDrive,
  Mic
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { VaultFolderIcon } from '../components/shared/VaultFolderIcon';
import { ROUTES } from '../constants';
import { useVaultStore } from '../store/vaultStore';
import { useStorage } from '../hooks/useStorage';
import { useUiStore } from '../store/uiStore';

export function Dashboard() {
  const navigate = useNavigate();
  const isDecoy = useVaultStore((state) => state.isDecoy);
  const { stats, isLoading } = useStorage();
  const globalViewMode = useUiStore((state) => state.viewMode);

  // Staging state to handle staggered mounting effects
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const quickAccessPortals = [
    { portal: 'notes', label: 'Notes', sub: 'Encrypted text documents', icon: FileText, path: ROUTES.NOTES },
    { portal: 'gallery', label: 'Gallery', sub: 'Protected visual memories', icon: Images, path: ROUTES.GALLERY },
    { portal: 'files', label: 'Files', sub: 'Generic local files', icon: Folder, path: ROUTES.FILES },
    { portal: 'passwords', label: 'Passwords', sub: 'Masked login keychains', icon: Key, path: ROUTES.PASSWORDS },
    { portal: 'cards', label: 'Cards', sub: 'Encrypted payment records', icon: CreditCard, path: ROUTES.CARDS },
    { portal: 'diary', label: 'Diary', sub: 'Private daily logs and reflections', icon: BookOpen, path: ROUTES.DIARY },
    { portal: 'voice', label: 'Voice', sub: 'Encrypted voice memos', icon: Mic, path: ROUTES.VOICE || '#' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-10 pb-12 select-none animate-fade-in">
        {/* Metric Loading Skeletons */}
        <div>
          <h2 className="text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] tracking-wider mb-5">
            Metrics Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="h-[80px] bg-gray-100 dark:bg-[#252525] animate-pulse rounded-xl p-4 flex flex-col justify-center"
              >
                <div className="h-3 bg-gray-200 dark:bg-[#1E1E1E] rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-[#1E1E1E] rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Feature Loading Skeletons */}
        <div>
          <h2 className="text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] tracking-wider mb-5">
            Quick Access Portals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="h-[100px] bg-gray-100 dark:bg-[#252525] animate-pulse rounded-xl p-4 flex flex-col justify-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-[#1E1E1E]" />
                <div className="h-3 bg-gray-200 dark:bg-[#1E1E1E] rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statMetrics = [
    { label: 'Total Items', value: `${stats.totalItems} Items`, icon: HardDrive, subtitle: 'On-device records' },
    { label: 'Storage Used', value: stats.formattedSize, icon: Shield, subtitle: 'Total volume file length' },
    { label: 'Last Backup', value: stats.lastBackupFormatted, icon: Clock, subtitle: 'Latest session backup' },
  ];

  return (
    <div className="space-y-10 select-none pb-12 animate-fade-in">
      
      {/* Decoy Mode Banner Notice */}
      {isDecoy && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/25 rounded-xl flex items-center gap-3 animate-slide-up text-amber-800 dark:text-amber-400">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse-soft" />
          <div className="text-sm font-normal">
            <strong>Security Notice:</strong> You have unlocked the Vault using extreme duress decoy credentials. The database is presented as empty.
          </div>
        </div>
      )}

      {/* Row 1 — Quick access cards */}
      <div>
        <h2 className="text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] tracking-wider mb-5">
          Quick Access Portals
        </h2>
        
        <div className={globalViewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
          {quickAccessPortals.map((item, idx) => {
            const Icon = item.icon;
            const count = stats.itemsByType[item.portal] || 0;

            if (globalViewMode === 'list') {
              return (
                <div
                  key={item.portal}
                  className="cursor-pointer group flex items-center justify-between bg-white dark:bg-[#1E1E1E] transition-all duration-200 select-none opacity-0 p-4 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-[#333333]"
                  style={{
                    animation: mounted ? `fadeIn 350ms ease-out ${idx * 60}ms forwards, slideUp 350ms ease-out ${idx * 60}ms forwards` : 'none'
                  }}
                  onClick={() => {
                    if (item.path !== '#') navigate(item.path);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#F5F5F5] dark:bg-[#252525] rounded-xl text-[#1A1A1A] dark:text-[#F0F0F0] group-hover:bg-[#1A1A1A] dark:group-hover:bg-[#F0F0F0] group-hover:text-white dark:group-hover:text-[#141414] transition-all duration-200 flex-shrink-0">
                      <Icon className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0] block mb-0.5">
                        {item.label}
                      </h3>
                      <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888]">
                        {item.sub}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {count > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-[#252525] text-neutral-600 dark:text-neutral-400 rounded-lg">
                        {count} Items
                      </span>
                    )}
                    <span className="text-[#9B9B9B] group-hover:text-[#1A1A1A] dark:group-hover:text-[#F0F0F0] transition-colors cursor-pointer">
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 duration-150" />
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Card 
                key={item.portal} 
                className="cursor-pointer group flex flex-col justify-between bg-white dark:bg-[#1E1E1E] transition-all duration-200 select-none opacity-0"
                style={{
                  animation: mounted ? `fadeIn 350ms ease-out ${idx * 60}ms forwards, slideUp 350ms ease-out ${idx * 60}ms forwards` : 'none'
                }}
                onClick={() => {
                  if (item.path !== '#') navigate(item.path);
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-[#F5F5F5] dark:bg-[#252525] rounded-xl text-[#1A1A1A] dark:text-[#F0F0F0] group-hover:bg-[#1A1A1A] dark:group-hover:bg-[#F0F0F0] group-hover:text-white dark:group-hover:text-[#141414] transition-all duration-200">
                      <Icon className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div className="flex items-center gap-2">
                      {count > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-[#252525] text-neutral-600 dark:text-neutral-400 rounded-lg">
                          {count}
                        </span>
                      )}
                      <span className="text-[12px] text-[#9B9B9B] group-hover:text-[#1A1A1A] dark:group-hover:text-[#F0F0F0] font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
                        Open <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 duration-150" />
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-[15px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0] block mb-1">
                    {item.label}
                  </CardTitle>
                  <CardDescription className="text-[13px] text-[#6B6B6B] dark:text-[#888888] line-clamp-2 leading-relaxed">
                    {item.sub}
                  </CardDescription>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Row 2 — shortcut folders strip */}
      <div>
        <h2 className="text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] tracking-wider mb-5">
          Shortcut Folders
        </h2>
        
        <div className="flex items-center gap-12 overflow-x-auto py-2 scrollbar-none">
          {quickAccessPortals.map((item, idx) => {
            const count = stats.itemsByType[item.portal] || 0;

            return (
              <div 
                key={item.portal}
                onClick={() => {
                  if (item.path !== '#') navigate(item.path);
                }}
                className="flex flex-col items-center gap-2.5 group cursor-pointer focus:outline-none flex-shrink-0 relative opacity-0"
                style={{
                  animation: mounted ? `fadeIn 350ms ease-out ${(idx + quickAccessPortals.length) * 50}ms forwards, slideUp 350ms ease-out ${(idx + quickAccessPortals.length) * 50}ms forwards` : 'none'
                }}
              >
                <div className="w-[84px] h-[84px] bg-[#F5F5F5] dark:bg-[#1E1E1E] rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-[#1A1A1A] dark:group-hover:bg-[#F0F0F0] relative">
                  <VaultFolderIcon className="w-11 h-11 text-[#9B9B9B] transform transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:text-white dark:group-hover:text-[#141414]" />
                  {count > 0 && (
                    <span className="absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 bg-neutral-200 dark:bg-[#333333] text-[#1A1A1A] dark:text-white rounded-full">
                      {count}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#6B6B6B] dark:text-[#888888] group-hover:text-[#1A1A1A] dark:group-hover:text-white font-medium transition-colors">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3 — Stats row */}
      <div>
        <h2 className="text-[11px] uppercase font-semibold text-[#9B9B9B] dark:text-[#888888] tracking-wider mb-5">
          Metrics Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statMetrics.map((stat, idx) => {
            const MetIcon = stat.icon;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-[#1E1E1E] p-6 rounded-xl flex flex-col justify-between transition-all duration-200 opacity-0"
                style={{
                  animation: mounted ? `fadeIn 350ms ease-out ${(idx + quickAccessPortals.length * 2) * 50}ms forwards, slideUp 350ms ease-out ${(idx + quickAccessPortals.length * 2) * 50}ms forwards` : 'none'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#6B6B6B] dark:text-[#888888] uppercase tracking-wider leading-none">
                    {stat.label}
                  </span>
                  <MetIcon className="w-4 h-4 text-[#9B9B9B] dark:text-[#6B6B6B]" />
                </div>
                <div className="mt-4">
                  <p className="text-[22px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0] tracking-tight leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[12px] text-[#9B9B9B] dark:text-[#6B6B6B] mt-2 font-normal leading-none font-sans">
                    {stat.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

