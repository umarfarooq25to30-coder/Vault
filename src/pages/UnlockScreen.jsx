// Unlock UI prompting for master password credentials, checking brute-force lockouts, running real-time countdowns, presenting escalating caution alerts, and loading wipe views.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, XCircle, Clock, Unlock, Loader2, ShieldOff } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { useToastStore } from '../store/toastStore';
import { VaultLogo } from '../components/shared/VaultLogo';
import { ROUTES } from '../constants';

export function UnlockScreen() {
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);

  const {
    isSetupComplete,
    isUnlocked,
    unlockVault,
    failedAttempts,
    lockoutUntil,
    resetVault,
    isWiped,
    resetWipedState
  } = useVaultStore();

  const addToast = useToastStore((state) => state.addToast);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [triggerShake, setTriggerShake] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSetupNewVault = () => {
    resetWipedState();
    navigate(ROUTES.SETUP, { replace: true });
  };

  // Auto-redirect if not setup yet
  useEffect(() => {
    if (!isSetupComplete && !isWiped) {
      navigate(ROUTES.SETUP, { replace: true });
    }
  }, [isSetupComplete, isWiped, navigate]);

  // Lock scrollbars globally in auth flow
  useEffect(() => {
    document.body.classList.add('auth-page-active');
    return () => {
      document.body.classList.remove('auth-page-active');
    };
  }, []);

  // Focus input on load
  useEffect(() => {
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [isWiped]);

  // Lockout countdown handler
  useEffect(() => {
    const checkLockout = () => {
      if (lockoutUntil) {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
          return true;
        }
      }
      setCountdown(0);
      return false;
    };

    const isLocked = checkLockout();
    if (isLocked) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setCountdown(0);
          clearInterval(interval);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || countdown > 0 || !password) return;

    setLoading(true);
    setErrorMsg('');
    setTriggerShake(false);

    // Yield short lag for premium processing feedback
    await new Promise((resolve) => setTimeout(resolve, 600));

    const result = await unlockVault(password);

    setLoading(false);

    if (result.success) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    } else {
      setPassword('');
      setTriggerShake(true);

      const nextTotalFailed = result.totalFailedAttempts;

      if (result.error === 'VAULT_WIPED') {
        addToast({
          variant: 'danger',
          title: 'Vault permanently wiped',
          description: 'Your vault has been permanently destroyed due to 10 consecutive incorrect attempts.',
          persistent: true
        });
        setErrorMsg('Vault permanently wiped due to too many failed attempts.');
      } else {
        // Trigger specific escalations of threat warning toasts
        if (nextTotalFailed === 5) {
          addToast({
            variant: 'warning',
            title: 'Too many failed attempts',
            description: 'Vault locked for 30 minutes. 5 attempts remaining before permanent wipe.',
            persistent: true
          });
        } else if (nextTotalFailed === 6) {
          addToast({
            variant: 'danger',
            title: 'Warning: 4 attempts remaining',
            description: 'Vault will be permanently wiped after 4 more incorrect attempts.',
            persistent: true
          });
        } else if (nextTotalFailed === 7) {
          addToast({
            variant: 'danger',
            title: 'Warning: 3 attempts remaining',
            description: 'Vault will be permanently wiped after 3 more incorrect attempts.',
            persistent: true
          });
        } else if (nextTotalFailed === 8) {
          addToast({
            variant: 'danger',
            title: 'Critical: 2 attempts remaining',
            description: 'The next 2 wrong passwords will permanently destroy all vault data.',
            persistent: true
          });
        } else if (nextTotalFailed === 9) {
          addToast({
            variant: 'danger',
            title: 'Final Warning: 1 attempt remaining',
            description: 'One more wrong password will permanently wipe your entire vault. Use a backup code if you forgot your password.',
            persistent: true
          });
        }

        if (result.error === 'LOCKED_OUT') {
          setErrorMsg('Too many attempts. Your Vault is temporarily locked.');
        } else {
          const attemptsLeft = result.attemptsLeft !== undefined ? result.attemptsLeft : Math.max(0, 5 - (failedAttempts + 1));
          setErrorMsg(`Incorrect password. ${attemptsLeft} attempts remaining.`);
        }
      }
      
      // Delay focus back to password input after shake
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }, 300);
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // RENDER DEDICATED SECURITY WIPE SCREEN
  if (isWiped) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA] dark:bg-[#141414] font-sans text-[#1A1A1A] dark:text-[#F0F0F0] select-none">
        <div className="absolute inset-0 pointer-events-none opacity-4 dark:opacity-2"
          style={{
            backgroundImage: 'radial-gradient(#1a1a1a 2px, transparent 2px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="w-[440px] bg-white dark:bg-[#1E1E1E] rounded-2xl p-10 text-center flex flex-col items-center animate-slide-up">
          <div className="w-[72px] h-[72px] flex items-center justify-center rounded-full bg-red-50 dark:bg-red-950/25 text-[#EF4444] mb-6">
            <ShieldOff className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#EF4444]">Vault Wiped</h1>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-3 leading-relaxed">
            After 10 incorrect password attempts, your vault has been permanently erased for security. All encrypted data has been deleted from this device.
          </p>
          
          <div className="h-6" />
          
          <p className="text-[11px] text-[#9B9B9B] dark:text-[#6B6B6B] leading-normal mb-8 max-w-[320px]">
            This is a security feature to protect your data if your device falls into the wrong hands.
          </p>
          
          <button
            onClick={handleSetupNewVault}
            className="w-full h-11 flex items-center justify-center bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all cursor-pointer"
          >
            Set up a new vault
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA] dark:bg-[#141414] relative overflow-hidden select-none font-sans text-[#1A1A1A] dark:text-[#F0F0F0]">
      {/* Premium subtle dot grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-4 dark:opacity-2"
        style={{
          backgroundImage: 'radial-gradient(#1a1a1a 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Slide-Up container card: Zero borders, zero shadows */}
      <div 
        className={`w-[400px] bg-white dark:bg-[#1E1E1E] rounded-2xl p-10 animate-slide-up ${
          triggerShake ? 'animate-shake' : ''
        }`}
      >
        {/* LOGO AREA: Zero border icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-[72px] h-[72px] flex items-center justify-center rounded-full bg-[#F5F5F5] dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0]">
            <VaultLogo className="w-11 h-11 text-[#1A1A1A] dark:text-[#F0F0F0]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-4">Vault</h1>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal">
            Your private space
          </p>
        </div>

        {/* CONTRAST DIVIDER */}
        <div className="h-6" />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PASSWORD FIELD BLOCK */}
          <div>
            <label className="block text-[13px] font-medium text-[#6B6B6B] dark:text-[#888888] mb-2 select-text">
              Master password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="master-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || countdown > 0}
                required
                className="w-full h-11 px-4 pr-11 text-[15px] rounded-lg bg-[#F5F5F5] dark:bg-[#141414] border-0 text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] outline-none select-text transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || countdown > 0}
                className="absolute right-3 top-2.5 h-6 w-6 flex items-center justify-center text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* DYNAMIC ERROR PILL */}
          {errorMsg && countdown === 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FEF2F2] dark:bg-[#EF4444]/10 rounded-lg text-[#DC2626] dark:text-red-450 animate-fade-in">
              <XCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
              <span className="text-[13px] leading-snug font-normal select-text">{errorMsg}</span>
            </div>
          )}

          {/* LOCKOUT DISPLAY WARNING */}
          {countdown > 0 && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-800 dark:text-amber-400 select-text animate-fade-in font-sans">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse-soft flex-shrink-0" />
              <span className="text-[13px] font-normal leading-relaxed">
                Too many attempts. Try again in <strong className="font-mono">{formatCountdown(countdown)}</strong>
              </span>
            </div>
          )}

          {/* INTERACTIVE ACTION BUTTON */}
          <button
            type="submit"
            disabled={loading || countdown > 0 || !password}
            className="w-full h-11 flex items-center justify-center gap-2 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none active:transform active:scale-[0.98] hover:scale-[0.995] disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#141414]" />
                <span>Unlocking...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Vault</span>
              </>
            )}
          </button>
        </form>

        {/* BOTTOM AREA HELPERS */}
        <div className="flex flex-col items-center mt-6 gap-2.5">
          <span 
            onClick={() => navigate('/recover')}
            className="text-[12px] text-[#9B9B9B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] font-medium cursor-pointer transition-colors"
          >
            Forgot password?
          </span>
          <span className="text-[11px] text-[#9B9B9B] dark:text-[#6B6B6B] font-mono tracking-wider mt-1 select-none font-normal">
            v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}

export default UnlockScreen;
