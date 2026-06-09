// Full screen page to reset and update user's master password after valid recovery with automatic item re-encryption.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  EyeOff, 
  Eye, 
  ArrowRight, 
  Loader2, 
  Check, 
  Copy, 
  Download 
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { useToastStore } from '../store/toastStore';
import { verifyPasswordStrength, generateBackupCodes } from '../crypto/engine';
import { VaultLogo } from '../components/shared/VaultLogo';
import { ROUTES } from '../constants';

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { isUnlocked, derivedKey, changeMasterPassword } = useVaultStore();
  const addToast = useToastStore((state) => state.addToast);

  // Core navigation guard
  useEffect(() => {
    if (!isUnlocked || !derivedKey) {
      navigate(ROUTES.UNLOCK, { replace: true });
    }
  }, [isUnlocked, derivedKey, navigate]);

  // Lock scrollbars globally in auth flow
  useEffect(() => {
    document.body.classList.add('auth-page-active');
    return () => {
      document.body.classList.remove('auth-page-active');
    };
  }, []);

  // Phase steps: 1 (Create new password), 2 (Save brand new backup codes), 3 (Complete)
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Backup codes list
  const [newCodes, setNewCodes] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  // Compute password strength metrics
  const strength = verifyPasswordStrength(password);

  // Copy helper
  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
    addToast({
      variant: 'success',
      title: 'Copied',
      description: `Backup code #${index + 1} copied to clipboard.`
    });
  };

  // Download helper for security backup codes
  const handleDownloadCodes = () => {
    try {
      const title = 'Vault New Backup Codes — Save these somewhere safe';
      const separator = '='.repeat(40);
      const text = [
        title,
        separator,
        `Generated At: ${new Date().toLocaleString()}`,
        `Please keep these stored in a safe offline location.`,
        separator,
        ...newCodes.map((code, index) => `${index + 1}. ${code}`),
        separator,
        'Vault Offline Personal Storage Platform'
      ].join('\n');

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vault-new-backup-codes.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloaded(true);
      addToast({
        variant: 'success',
        title: 'File Saved',
        description: 'vault-new-backup-codes.txt downloaded successfully.'
      });
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (strength.score < 2) {
      setErrorMsg('Please select a stronger master password (minimum Fair).');
      return;
    }

    setUpdating(true);

    // Short UX delay to look robust and security-mindful
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate brand new backup codes for them
    const codes = await generateBackupCodes();
    setNewCodes(codes);

    const result = await changeMasterPassword(password, codes);
    setUpdating(false);

    if (result.success) {
      addToast({
        variant: 'success',
        title: 'Vault Re-encrypted',
        description: 'All your offline vault items have been securely re-encrypted with your new master password.'
      });
      // Advance to backup code step to let them save the new codes
      setStep(2);
    } else {
      setErrorMsg(result.error || 'Failed to update master password. Please try again.');
    }
  };

  const handleComplete = () => {
    navigate(ROUTES.DASHBOARD, { replace: true });
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA] dark:bg-[#141414] relative overflow-hidden select-none font-sans text-[#1A1A1A] dark:text-[#F0F0F0]">
      {/* Visual canvas dot styling */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-4 dark:opacity-2"
        style={{
          backgroundImage: 'radial-gradient(#1a1a1a 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-[480px] bg-white dark:bg-[#1E1E1E] rounded-2xl p-10 animate-slide-up space-y-6">
        
        {/* STEP 1: CREATE NEW PASSWORD */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-[#F5F5F5] dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0]">
                <VaultLogo className="w-10 h-10 text-[#1A1A1A] dark:text-[#F0F0F0]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-4">Reset Master Password</h1>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal max-w-[340px]">
                Enter a strong new password. All vault items will be re-encrypted automatically with an updated key.
              </p>
            </div>

            {/* Security Warning Panel */}
            <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-amber-800 dark:text-amber-450 leading-relaxed font-normal">
                This password cannot be reset or recovered online. Make sure you memorize it. If you lose this password, your vault data is unrecoverable.
              </div>
            </div>

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
              {/* Password Input Block */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#6B6B6B] dark:text-[#888888]">
                  New master password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new master password (min 8 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={updating}
                    className="w-full h-11 px-4 pr-11 text-[15px] rounded-lg bg-[#F5F5F5] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] focus:bg-[#EFEFEF] dark:focus:bg-[#222222] outline-none select-text transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 h-6 w-6 flex items-center justify-center text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password strength indicators */}
                {password && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="grid grid-cols-4 gap-1 w-full h-[3px]">
                      <div 
                        className="h-full rounded-sm" 
                        style={{ 
                          backgroundColor: strength.score >= 1 ? strength.color : '#E5E5E5',
                          transition: 'background-color 300ms ease'
                        }} 
                      />
                      <div 
                        className="h-full rounded-sm" 
                        style={{ 
                          backgroundColor: strength.score >= 2 ? strength.color : '#E5E5E5',
                          transition: 'background-color 300ms ease'
                        }} 
                      />
                      <div 
                        className="h-full rounded-sm" 
                        style={{ 
                          backgroundColor: strength.score >= 3 ? strength.color : '#E5E5E5',
                          transition: 'background-color 300ms ease'
                        }} 
                      />
                      <div 
                        className="h-full rounded-sm" 
                        style={{ 
                          backgroundColor: strength.score >= 4 ? strength.color : '#E5E5E5',
                          transition: 'background-color 300ms ease'
                        }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-medium uppercase tracking-wider text-[#9B9B9B] dark:text-[#6B6B6B]">
                      <span>Strength Indicator</span>
                      <span style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input Block */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#6B6B6B] dark:text-[#888888]">
                  Confirm new master password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat master password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={updating}
                    className="w-full h-11 px-4 pr-11 text-[15px] rounded-lg bg-[#F5F5F5] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] focus:bg-[#EFEFEF] dark:focus:bg-[#222222] outline-none select-text transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 h-6 w-6 flex items-center justify-center text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error messages */}
              {errorMsg && (
                <div className="p-3 bg-[#FEF2F2] dark:bg-[#EF4444]/10 rounded-lg text-[#DC2626] dark:text-red-450 text-[12.5px] font-normal leading-snug animate-fade-in select-text">
                  {errorMsg}
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={updating || !password || !confirmPassword}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#141414]" />
                    <span>Encrypting Vault Items...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password & Re-encrypt</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SAVE BRAND NEW BACKUP CODES */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div className="flex flex-col items-center">
              <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
                <CheckCircle2 className="w-10 h-10 animate-scale-in" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-4">New backup codes generated</h1>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal max-w-[340px]">
                Because you updated your password, your previous backup codes have been invalidated. Save these new ones safely.
              </p>
            </div>

            {/* Grid of codes */}
            <div className="grid grid-cols-2 gap-3 max-w-[400px] mx-auto select-text">
              {newCodes.map((code, index) => {
                const isCopied = copiedIndex === index;
                return (
                  <div
                    key={index}
                    onClick={() => handleCopyCode(code, index)}
                    className="group relative flex items-center justify-between h-10 px-3 bg-[#F5F5F5] dark:bg-[#141414] hover:bg-[#EEEEEE] dark:hover:bg-[#1E1E1E] rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-[13px] font-medium tracking-wide text-[#1A1A1A] dark:text-[#F0F0F0] select-text">
                      {code}
                    </span>
                    <div className="text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors">
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Download Row */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleDownloadCodes}
                className="h-10 px-5 flex items-center gap-2 bg-[#F5F5F5] dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0] rounded-lg text-xs font-semibold hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download new-backup-codes.txt</span>
              </button>
            </div>

            {/* Warn Check reminder */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg text-[12px] text-blue-800 dark:text-blue-400 font-normal leading-relaxed text-left max-w-[400px] mx-auto select-text">
              Each fallback code can only be used once. After saving these codes, write them down or save them offline.
            </div>

            <button
              type="button"
              onClick={handleComplete}
              disabled={!downloaded}
              className="w-full h-11 flex items-center justify-center bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Verify & Continue to Dashboard</span>
            </button>
            
            {!downloaded && (
              <p className="text-[11px] text-[#9B9B9B] dark:text-[#6B6B6B] font-normal italic">
                Please download the txt file of backup codes to enable continue.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ResetPasswordScreen;
