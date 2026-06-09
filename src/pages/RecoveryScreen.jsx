// Recovery UI layout validating one of the 8 offline recovery backup codes, and restoring the zero-knowledge session upon verification success.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Loader2, CheckCircle2, AlertOctagon, KeyRound, ArrowRight } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { useToastStore } from '../store/toastStore';
import { ROUTES } from '../constants';

export function RecoveryScreen() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const { recoverWithBackupCode } = useVaultStore();
  const addToast = useToastStore((state) => state.addToast);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [triggerShake, setTriggerShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Lock scrollbars globally in auth flow
  useEffect(() => {
    document.body.classList.add('auth-page-active');
    return () => {
      document.body.classList.remove('auth-page-active');
    };
  }, []);

  const handleCodeChange = (e) => {
    setErrorMsg('');
    setTriggerShake(false);
    
    // Remove all non-alphanumeric characters, convert to uppercase
    let val = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''); // Using backup code character set strictly to help users avoid letters like O/I/0/1
    if (val.length > 10) {
      val = val.slice(0, 10);
    }
    if (val.length > 5) {
      val = val.slice(0, 5) + '-' + val.slice(5);
    }
    setCode(val);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const cleanCode = code.replace('-', '').trim();
    if (cleanCode.length !== 10) {
      setErrorMsg('Please enter a complete 10-character backup code.');
      setTriggerShake(true);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setTriggerShake(false);

    // Yield short lag to reflect crypto verification
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = await recoverWithBackupCode(code);
    setLoading(false);

    if (result.success) {
      setIsSuccess(true);
      // Let's add toast to show remaining codes
      addToast({
        variant: 'success',
        title: 'Vault Access Recovered',
        description: `Backup code consumed. ${result.codesRemaining} backup codes remaining.`,
        persistent: true,
      });
    } else {
      setTriggerShake(true);
      if (result.error === 'INVALID_CODE') {
        setErrorMsg('Invalid backup code. Please check and try again.');
      } else if (result.error === 'CODE_ALREADY_USED') {
        setErrorMsg('This backup code has already been used and is invalidated.');
      } else if (result.error === 'NO_BACKUP_CODES_SETUP') {
        setErrorMsg('No backup codes found associated with this Vault database.');
      } else if (result.error === 'DECRYPTION_FAILED') {
        setErrorMsg('Decryption failed. The recovery key failed to unlock your Master Password securely.');
      } else {
        setErrorMsg('An unexpected error occurred during backup code verification.');
      }
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA] dark:bg-[#141414] relative overflow-hidden select-none font-sans text-[#1A1A1A] dark:text-[#F0F0F0]">
      {/* Background delicate accent */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-4 dark:opacity-2"
        style={{
          backgroundImage: 'radial-gradient(#1a1a1a 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main card */}
      <div 
        className={`w-[440px] bg-white dark:bg-[#1E1E1E] rounded-2xl p-10 animate-slide-up ${
          triggerShake ? 'animate-shake' : ''
        }`}
      >
        {!isSuccess ? (
          <>
            {/* Header branding */}
            <div className="flex flex-col items-center text-center">
              <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/25 text-blue-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-4">Account Recovery</h1>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal max-w-[280px]">
                Enter one of your 8 backup codes to regain access to your vault.
              </p>
            </div>

            {/* Info panel */}
            <div className="mt-5 p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg flex gap-3">
              <AlertOctagon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-blue-800 dark:text-blue-400 font-normal leading-relaxed select-text">
                Each backup code can only be used once. After using a code, it will be permanently invalidated.
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-5 mt-6">
              {/* CODE FIELD BLOCK */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#6B6B6B] dark:text-[#888888]">
                  Backup code
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={11}
                  placeholder="XXXXX-XXXXX"
                  value={code}
                  onChange={handleCodeChange}
                  disabled={loading}
                  className="w-full h-11 px-4 text-center font-mono text-[16px] tracking-widest rounded-lg bg-[#F5F5F5] dark:bg-[#141414] focus:bg-[#EFEFEF] dark:focus:bg-[#222222] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] outline-none select-text transition-all duration-150"
                  required
                />
              </div>

              {/* ERROR STATE */}
              {errorMsg && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FEF2F2] dark:bg-[#EF4444]/10 rounded-lg text-[#DC2626] dark:text-red-450 animate-fade-in text-[12.5px] font-normal leading-snug">
                  <span className="select-text">{errorMsg}</span>
                </div>
              )}

              {/* TRIGGER SUBMIT */}
              <button
                type="submit"
                disabled={loading || code.replace('-', '').length !== 10}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#141414]" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/unlock')}
                className="text-[12px] text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to unlock</span>
              </button>
            </div>
          </>
        ) : (
          /* SUCCESS STATE PANEL */
          <div className="flex flex-col items-center text-center animate-fade-in space-y-6">
            <div className="w-[64px] h-[64px] flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
              <CheckCircle2 className="w-10 h-10 animate-scale-in" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                Backup Code Verified
              </h1>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-2 font-normal max-w-[320px]">
                Your vault is now unlocked. You can set a new master password now or continue straight to your dashboard.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(ROUTES.RESET_PASSWORD)}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Update Master Password</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#F5F5F5] dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecoveryScreen;
