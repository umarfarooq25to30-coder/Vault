// Settings configuration board showing visual themes toggles, system cryptographic reports, backups logs, and complete storage clear options.

import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useVault } from '../hooks/useVault';
import { 
  ShieldCheck, 
  Trash2, 
  Moon, 
  Sun, 
  Info, 
  Lock, 
  Database,
  RefreshCw,
  Laptop
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../db/schema';

export function Settings() {
  const { theme, isDarkMode, toggleTheme, setTheme } = useTheme();
  const { lockVault, setSetupComplete } = useVault();
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [confirmInput, setConfirmInput] = React.useState('');

  const handleWipeVault = async () => {
    if (confirmInput !== 'RESET') return;
    try {
      // Purge Dexie schema
      await db.delete();
      // Clear LocalStorage entries
      localStorage.clear();
      // Reload onboarding setup
      window.location.reload();
    } catch (err) {
      alert('Failed to erase local DB nodes: ' + err.message);
    }
  };

  const systemStats = [
    { label: 'Encryption Protocol', value: 'AES-256-GCM (Hardware accelerated)' },
    { label: 'Key Derivation Node', value: 'PBKDF2 SHA-256 (310,000 rounds)' },
    { label: 'DB Storage Engine', value: 'Dexie / IndexedDB Local Sandbox' },
    { label: 'Network Uptime', value: '100% Offline (No servers, no trace)' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-medium tracking-tight text-[#1A1A1A] dark:text-[#F0F0F0]">Local Settings</h2>
        <p className="text-xs text-[#6B6B6B] dark:text-[#888888]">Manage local database partitions and viewing preferences</p>
      </div>

      {/* Row 1: Appearance Options */}
      <Card>
        <CardTitle className="flex items-center gap-1.5 mb-2">
          {theme === 'light' ? <Sun className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
          Appearance Preferences
        </CardTitle>
        <CardDescription>
          Switch between Light Monochrome, Dark Cosmic, or System Automatic sync layouts. Visual preferences are saved in local cache securely.
        </CardDescription>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${
              theme === 'light'
                ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] font-semibold scale-102'
                : 'bg-[#F5F5F5] dark:bg-[#252525] text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#333333]'
            }`}
          >
            <Sun className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-semibold">Light monochrome</span>
            <span className={`text-[10px] mt-0.5 ${theme === 'light' ? 'text-zinc-300 dark:text-zinc-650' : 'text-[#9B9B9B] dark:text-[#6B6B6B]'}`}>Always Light</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] font-semibold scale-102'
                : 'bg-[#F5F5F5] dark:bg-[#252525] text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#333333]'
            }`}
          >
            <Moon className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-semibold">Dark cosmic</span>
            <span className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-zinc-300 dark:text-zinc-650' : 'text-[#9B9B9B] dark:text-[#6B6B6B]'}`}>Always Dark</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${
              theme === 'system'
                ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] font-semibold scale-102'
                : 'bg-[#F5F5F5] dark:bg-[#252525] text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#333333]'
            }`}
          >
            <Laptop className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-semibold">System preferences</span>
            <span className={`text-[10px] mt-0.5 ${theme === 'system' ? 'text-zinc-300 dark:text-zinc-650' : 'text-[#9B9B9B] dark:text-[#6B6B6B]'}`}>OS Auto Match</span>
          </button>
        </div>
      </Card>

      {/* Row: Keyboard Shortcuts Guide */}
      <Card>
        <CardTitle className="flex items-center gap-1.5 mb-2">
          Keyboard Shortcuts Guide
        </CardTitle>
        <CardDescription>
          Navigate and control your vault instantly using these global key combinations.
        </CardDescription>

        <div className="mt-4 border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl overflow-hidden divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A]">
          <div className="flex justify-between items-center p-3 text-sm">
            <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#888888]">Save active item (Note, Card, Diary)</span>
            <span className="font-mono text-xs text-[#1A1A1A] dark:text-white font-medium bg-[#EFEFEF] dark:bg-[#252525] px-2 py-1 rounded">Ctrl/Cmd + S</span>
          </div>
          <div className="flex justify-between items-center p-3 text-sm">
            <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#888888]">Create new item</span>
            <span className="font-mono text-xs text-[#1A1A1A] dark:text-white font-medium bg-[#EFEFEF] dark:bg-[#252525] px-2 py-1 rounded">Ctrl/Cmd + N</span>
          </div>
          <div className="flex justify-between items-center p-3 text-sm">
            <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#888888]">Find and search</span>
            <span className="font-mono text-xs text-[#1A1A1A] dark:text-white font-medium bg-[#EFEFEF] dark:bg-[#252525] px-2 py-1 rounded">Ctrl/Cmd + F</span>
          </div>
          <div className="flex justify-between items-center p-3 text-sm">
            <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#888888]">Cancel or close editor</span>
            <span className="font-mono text-xs text-[#1A1A1A] dark:text-white font-medium bg-[#EFEFEF] dark:bg-[#252525] px-2 py-1 rounded">Esc</span>
          </div>
        </div>
      </Card>

      {/* Row 2: Cryptographic Information Report */}
      <Card>
        <CardTitle className="flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          On-Device Cryptographic Architecture
        </CardTitle>
        <CardDescription>
          Vault executes cryptosystems directly inside your browser container using the self-contained native Web Crypto API. Your master keys never traverse networks.
        </CardDescription>

        <div className="mt-4 border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-xl overflow-hidden divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A]">
          {systemStats.map((stat, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 text-sm">
              <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#888888]">{stat.label}</span>
              <span className="font-mono text-xs text-[#1A1A1A] dark:text-white font-medium">{stat.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Row 3: Security & Lockout Actions */}
      <Card>
        <CardTitle className="flex items-center gap-1.5 mb-2">
          <Lock className="w-4 h-4" />
          Immediate Lockout Controls
        </CardTitle>
        <CardDescription>
          Revoke memory access immediately. This wipes Derived CryptoKeys from active React memory and triggers the lock gate screens.
        </CardDescription>

        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={lockVault} className="text-xs">
            Lock Vault Immediately
          </Button>
        </div>
      </Card>

      {/* Row 4: Dangerous zone - Purge */}
      <Card className="border-red-200/50 dark:border-red-900/40 bg-red-50/10">
        <CardTitle className="flex items-center gap-1.5 text-red-650 dark:text-red-400 mb-2">
          <Trash2 className="w-4 h-4" />
          Danger Zone: Emergency Factory Reset
        </CardTitle>
        <CardDescription>
          Wipe the database completely. Erases IndexedDB clusters, removes all historical document backups, resets master keys, and re-opens onboarding setup.
        </CardDescription>

        {!showResetConfirm ? (
          <div>
            <div className="mt-4 p-4 bg-red-50/50 dark:bg-red-950/25 border border-red-150 rounded-xl mb-4 text-xs text-red-750 dark:text-red-450 leading-normal">
              <strong>CRITICAL WARNING:</strong> Proceeding deletes every single note, photo, card, password record, and file. It destroys your unique local encryption structures, rendering local backups unreadable.
            </div>

            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => {
                setShowResetConfirm(true);
                setConfirmInput('');
              }} 
              className="text-xs font-semibold cursor-pointer"
            >
              Trigger Emergency Factory Reset
            </Button>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/40 rounded-xl space-y-4 animate-slide-up">
            <p className="text-xs text-red-600 dark:text-red-400 leading-normal font-semibold">
              ⚠️ Are you absolutely sure? This action is instant, complete, on-device, and 100% irreversible.
            </p>
            
            <div className="space-y-2">
              <label htmlFor="settings-reset-input" className="block text-[11px] font-semibold text-[#6B6B6B] dark:text-[#888888]">
                Type <strong className="font-mono text-red-500">RESET</strong> below to confirm permanent destruction of all vault data:
              </label>
              <div className="flex flex-wrap gap-2.5 items-center">
                <input
                  id="settings-reset-input"
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type RESET"
                  className="h-9 px-3 w-40 text-xs font-mono tracking-wider rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-[#141414] focus:outline-none focus:ring-1 focus:ring-red-500 text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B]"
                />
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={handleWipeVault}
                  disabled={confirmInput !== 'RESET'}
                  className="text-xs font-semibold h-9 cursor-pointer"
                >
                  Factory Reset
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                    setShowResetConfirm(false);
                    setConfirmInput('');
                  }}
                  className="text-xs font-medium h-9 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      
    </div>
  );
}

export default Settings;
