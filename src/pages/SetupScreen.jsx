// Wizard setup UI configuring the cryptographic master password, local security parameters, backup recovery codes, and decoy duress profiles.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XSquare, 
  Shield, 
  Bell, 
  EyeOff, 
  Eye, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Check, 
  Copy, 
  Download 
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { verifyPasswordStrength, generateBackupCodes } from '../crypto/engine';
import { VaultLogo } from '../components/shared/VaultLogo';
import { ROUTES } from '../constants';

export function SetupScreen() {
  const navigate = useNavigate();
  const { initializeVault } = useVaultStore();

  // Lock scrollbars globally in auth flow
  useEffect(() => {
    document.body.classList.add('auth-page-active');
    return () => {
      document.body.classList.remove('auth-page-active');
    };
  }, []);

  // Step wizard state: 1 (Password), 2 (Backup codes), 3 (Security settings), 4 (Confirm & Create)
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('next'); 

  // Step 1: Password inputs
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2: Backup codes state
  const [backupCodes, setBackupCodes] = useState([]);
  const [codesSavedCheckbox, setCodesSavedCheckbox] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 3: Settings toggles
  const [autoLock, setAutoLock] = useState(true);
  const [backupReminders, setBackupReminders] = useState(true);
  const [duressMode, setDuressMode] = useState(false);
  const [decoyPassword, setDecoyPassword] = useState('');
  const [showDecoyPassword, setShowDecoyPassword] = useState(false);
  const [decoyError, setDecoyError] = useState('');

  // Step 4: Creation loading
  const [loading, setLoading] = useState(false);

  // Derive password strength indicators
  const strength = verifyPasswordStrength(password);

  const isPasswordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const navigateStep = (nextStep, dir = 'next') => {
    setDirection(dir);
    setStep(nextStep);
  };

  const handleStep1Next = async () => {
    if (password.length < 8) return;
    if (strength.score < 2) return;
    if (!isPasswordsMatch) return;

    // Generate backup codes once
    if (backupCodes.length === 0) {
      try {
        const codes = await generateBackupCodes();
        setBackupCodes(codes);
      } catch (err) {
        console.error('Failed to generate backup codes:', err);
      }
    }
    navigateStep(2, 'next');
  };

  const handleStep2Next = () => {
    if (!codesSavedCheckbox) return;
    navigateStep(3, 'next');
  };

  const handleStep3Next = () => {
    if (duressMode) {
      if (!decoyPassword) {
        setDecoyError('Please enter a decoy password when Duress mode is active.');
        return;
      }
      if (decoyPassword === password) {
        setDecoyError('Decoy password cannot be identical to your master password.');
        return;
      }
      if (decoyPassword.length < 8) {
        setDecoyError('Decoy password must be at least 8 characters long.');
        return;
      }
    }
    setDecoyError('');
    navigateStep(4, 'next');
  };

  // Copy and download utilities for backup codes step
  const getFormattedCodesText = () => {
    return [
      'Vault Backup Codes — Save these somewhere safe',
      '=============================================',
      'These codes are the ONLY way to regain access to your vault if you forget your master password.',
      'Each code can only be used once.',
      '',
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
      '',
      `Generated on: ${new Date().toUTCString()}`,
    ].join('\n');
  };

  const handleCopyCodes = () => {
    const text = getFormattedCodesText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = getFormattedCodesText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vault-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateVaultSubmit = async () => {
    setLoading(true);
    // Mimic deep encryption block metrics
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await initializeVault(password, {
      autoLock,
      backupReminders,
      duressMode,
      decoyPassword: duressMode ? decoyPassword : ''
    }, backupCodes);

    setLoading(false);
    if (result.success) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    } else {
      alert(`Database Setup Failed: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA] dark:bg-[#141414] relative overflow-hidden font-sans text-[#1A1A1A] dark:text-[#F0F0F0] select-none">
      {/* Background delicate accent */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-4 dark:opacity-2"
        style={{
          backgroundImage: 'radial-gradient(#1a1a1a 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* FIXED CONTAINER CARD: Zero borders, zero shadows */}
      <div className="w-[480px] bg-white dark:bg-[#1E1E1E] rounded-2xl p-10 animate-slide-up relative">
        
        {/* STEP DOTS INDICATORS */}
        <div className="flex justify-center items-center gap-1.5 mb-8">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className={`h-1.5 rounded-full transition-all duration-300 ease-in-out ${
                step === num 
                  ? 'w-[20px] bg-[#1A1A1A] dark:bg-[#F0F0F0]' 
                  : 'w-1.5 bg-[#E5E5E5] dark:bg-[#2A2A2A]'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: CREATE MASTER PASSWORD */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Header branding */}
            <div className="flex flex-col items-center text-center">
              <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-[#F5F5F5] dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0]">
                <VaultLogo className="w-10 h-10 text-[#1A1A1A] dark:text-[#F0F0F0]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-4">Create your master password</h1>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal">
                This password encrypts everything in your vault.
              </p>
            </div>

            {/* Inputs Box */}
            <div className="space-y-4">
              {/* Main master password */}
              <div>
                <label className="block text-[13px] font-medium text-[#6B6B6B] dark:text-[#888888] mb-1.5">
                  Master password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter master password (min 8 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 px-4 pr-11 text-[15px] rounded-lg bg-[#F5F5F5] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] focus:bg-[#EFEFEF] dark:focus:bg-[#222222] outline-none select-text transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 h-6 w-6 flex items-center justify-center text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password strength meter indicators */}
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
                    <div className="text-[12px] font-medium animate-fade-in" style={{ color: strength.color }}>
                      Strength: {strength.label}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm master password */}
              <div>
                <label className="block text-[13px] font-medium text-[#6B6B6B] dark:text-[#888888] mb-1.5">
                  Confirm password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm master password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full h-11 px-4 pr-11 text-[15px] rounded-lg bg-[#F5F5F5] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] focus:bg-[#EFEFEF] dark:focus:bg-[#222222] outline-none select-text transition-all duration-150"
                  />
                  <div className="absolute right-3 top-2.5 h-6 flex items-center gap-1.5">
                    {isPasswordsMatch && (
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E] animate-fade-in" />
                    )}
                    {isPasswordsMismatch && (
                      <XSquare className="w-5 h-5 text-[#EF4444] animate-fade-in" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="h-6 w-6 flex items-center justify-center text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] focus:outline-none"
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Advance triggers */}
            <button
              onClick={handleStep1Next}
              disabled={password.length < 8 || strength.score < 2 || !isPasswordsMatch}
              className="w-full h-11 flex items-center justify-center gap-1.5 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none active:transform active:scale-[0.985] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: SAVE BACKUP CODES */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold tracking-tight">Save your backup codes</h2>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal leading-relaxed">
                These 8 codes are the only way to recover access if you forget your master password.
              </p>
            </div>

            {/* Warn Panel (Urgent red alert: borderless) */}
            <div className="p-3 bg-[#FEF2F2] rounded-lg flex gap-3 leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-[#991B1B] leading-relaxed font-normal select-text">
                Each code can only be used once. Store these somewhere safe — printed paper, password manager, or secure note. We cannot recover them for you.
              </div>
            </div>

            {/* Codes Grid (2x4 columns layout: borderless) */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              {backupCodes.map((code, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-[#F5F5F5] dark:bg-[#1E1E1E] rounded-lg px-3 py-2"
                >
                  <span className="text-[11px] font-medium text-[#9B9B9B] dark:text-[#6B6B6B]">
                    {index + 1}
                  </span>
                  <span className="font-mono text-[13.5px] font-semibold tracking-wider text-[#1A1A1A] dark:text-[#F0F0F0] select-text">
                    {code}
                  </span>
                </div>
              ))}
            </div>

            {/* Copy and Download utility buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyCodes}
                className="h-10 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-[#1A1A1A] dark:text-[#F0F0F0] transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-[#22C55E]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#6B6B6B] dark:text-[#888888]" />
                    <span>Copy all codes</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadCodes}
                className="h-10 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-[#1A1A1A] dark:text-[#F0F0F0] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#6B6B6B] dark:text-[#888888]" />
                <span>Download backup-codes.txt</span>
              </button>
            </div>

            {/* Mandatory confirmation checkbox */}
            <div className="rounded-lg p-3.5 bg-[#FAFAFA] dark:bg-[#1C1C1C] flex gap-3 transition-all">
              <input
                id="codes-saved-checkbox"
                type="checkbox"
                checked={codesSavedCheckbox}
                onChange={(e) => setCodesSavedCheckbox(e.target.checked)}
                className="w-4 h-4 text-[#1A1A1A] rounded mt-0.5 cursor-pointer accent-[#1A1A1A]"
              />
              <label 
                htmlFor="codes-saved-checkbox"
                className="text-[12px] text-[#6B6B6B] dark:text-[#888888] font-normal leading-normal select-none cursor-pointer"
              >
                I have saved all 8 backup codes in a safe place. I understand these are the only way to recover access if I forget my password.
              </label>
            </div>

            {/* Nav button row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => navigateStep(1, 'back')}
                className="h-11 flex items-center justify-center gap-1.5 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleStep2Next}
                disabled={!codesSavedCheckbox}
                className="h-11 flex items-center justify-center gap-1.5 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SECURITY OPTIONS */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Security settings</h2>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal">
                Configure how Vault protects your data.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Options 1: Auto-lock */}
              <div 
                onClick={() => setAutoLock(!autoLock)}
                className="flex items-center justify-between rounded-xl p-4 bg-[#F5F5F5] dark:bg-[#1E1E1E] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] transition-colors select-none cursor-pointer"
              >
                <div className="flex gap-3">
                  <div className="text-[#1A1A1A] dark:text-[#F0F0F0] mt-0.5">
                    <Shield className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium leading-none">Auto-lock vault</span>
                    <span className="text-[12px] text-[#6B6B6B] dark:text-[#888888] mt-1 leading-snug">Lock after 5 minutes of inactivity</span>
                  </div>
                </div>
                {/* Switch */}
                <div 
                  className={`w-11 h-6 rounded-full p-[3px] flex items-center transition-colors duration-200 select-none ${
                    autoLock ? 'bg-[#1A1A1A] dark:bg-[#F0F0F0]' : 'bg-[#E5E5E5] dark:bg-[#3A3A3A]'
                  }`}
                >
                  <div 
                    className={`w-[18px] h-[18px] rounded-full bg-white transform transition-transform duration-200 ${
                      autoLock ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Options 2: Notifications */}
              <div 
                onClick={() => setBackupReminders(!backupReminders)}
                className="flex items-center justify-between rounded-xl p-4 bg-[#F5F5F5] dark:bg-[#1E1E1E] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] transition-colors select-none cursor-pointer"
              >
                <div className="flex gap-3">
                  <div className="text-[#1A1A1A] dark:text-[#F0F0F0] mt-0.5">
                    <Bell className="w-5 h-5 stroke-[1.5]" />
                   </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium leading-none">Backup reminders</span>
                    <span className="text-[12px] text-[#6B6B6B] dark:text-[#888888] mt-1 leading-snug">Weekly reminder to backup your vault</span>
                  </div>
                </div>
                {/* Switch */}
                <div 
                  className={`w-11 h-6 rounded-full p-[3px] flex items-center transition-colors duration-200 select-none ${
                    backupReminders ? 'bg-[#1A1A1A] dark:bg-[#F0F0F0]' : 'bg-[#E5E5E5] dark:bg-[#3A3A3A]'
                  }`}
                >
                  <div 
                    className={`w-[18px] h-[18px] rounded-full bg-white transform transition-transform duration-200 ${
                      backupReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Options 3: Duress Lock */}
              <div className="flex flex-col rounded-xl p-4 bg-[#F5F5F5] dark:bg-[#1E1E1E] transition-all">
                <div 
                  onClick={() => {
                    setDuressMode(!duressMode);
                    if (duressMode) {
                      setDecoyPassword('');
                      setDecoyError('');
                    }
                  }}
                  className="flex items-center justify-between select-none cursor-pointer"
                >
                  <div className="flex gap-3">
                    <div className="text-[#1A1A1A] dark:text-[#F0F0F0] mt-0.5">
                      <EyeOff className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium leading-none">Duress mode</span>
                      <span className="text-[12px] text-[#6B6B6B] dark:text-[#888888] mt-1 leading-snug">Set a decoy password that shows empty vault</span>
                    </div>
                  </div>
                  {/* Switch */}
                  <div 
                    className={`w-11 h-6 rounded-full p-[3px] flex items-center transition-colors duration-200 select-none ${
                      duressMode ? 'bg-[#1A1A1A] dark:bg-[#F0F0F0]' : 'bg-[#E5E5E5] dark:bg-[#3A3A3A]'
                    }`}
                  >
                    <div 
                      className={`w-[18px] h-[18px] rounded-full bg-white transform transition-transform duration-200 ${
                        duressMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Inline Decoy Credentials Setup */}
                {duressMode && (
                  <div className="mt-4 pt-4 space-y-2.5 animate-fade-in">
                    <label className="block text-[12px] font-medium text-[#1A1A1A] dark:text-[#F0F0F0]">
                      Decoy master password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showDecoyPassword ? 'text' : 'password'}
                        placeholder="Choose dual-password (min 8 chars)"
                        value={decoyPassword}
                        onChange={(e) => {
                          setDecoyPassword(e.target.value);
                          setDecoyError('');
                        }}
                        className="w-full h-10 px-3 pr-10 text-[14px] rounded-lg bg-white dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-[#9B9B9B] dark:placeholder-[#6B6B6B] outline-none select-text"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDecoyPassword(!showDecoyPassword)}
                        className="absolute right-3 top-2 h-6 w-6 flex items-center justify-center text-[#9B9B9B] dark:text-[#6B6B6B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] focus:outline-none"
                      >
                        {showDecoyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {decoyError && (
                      <div className="text-[12px] text-[#EF4444] leading-normal animate-fade-in font-normal">{decoyError}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Buttons Row */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigateStep(2, 'back')}
                className="h-11 flex items-center justify-center gap-1.5 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleStep3Next}
                className="h-11 flex items-center justify-center gap-1.5 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none transition-all duration-150 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM & CREATE */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold tracking-tight">You're all set</h2>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] mt-1 font-normal">
                Review and create your vault.
              </p>
            </div>

            {/* Config summary card: Borderless */}
            <div className="rounded-xl p-5 bg-[#FAFAFA] dark:bg-[#141414] text-left space-y-3.5">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[13px] font-medium leading-none">Master password configured</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[13px] font-medium leading-none">
                  Backup Codes (8 generated): <strong className="font-semibold text-emerald-600 dark:text-emerald-400">Stored</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[13.5px] font-medium leading-none">
                  Auto-lock (5 mins inactivity): <strong className="font-semibold">{autoLock ? 'Enabled' : 'Disabled'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[13.5px] font-medium leading-none">
                  Backup reminders (weekly): <strong className="font-semibold">{backupReminders ? 'Enabled' : 'Disabled'}</strong>
                </span>
              </div>
              {duressMode && (
                <div className="flex items-center gap-2.5 animate-fade-in">
                  <Check className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-[13.5px] font-medium leading-none">
                    Duress decoy credentials: <strong className="font-semibold">Enabled</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Permanent Warning */}
            <p className="text-[12px] text-[#9B9B9B] dark:text-[#6B6B6B] leading-relaxed select-text font-normal max-w-[360px] mx-auto">
              Remember: your password cannot be recovered online. Make sure you've saved your 8 backup codes in a safe place.
            </p>

            {/* Buttons Row */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleCreateVaultSubmit}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-1.5 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] rounded-lg text-sm font-medium hover:opacity-85 focus:outline-none active:transform active:scale-[0.985] disabled:opacity-40 select-none transition-all duration-150 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#141414]" />
                    <span>Creating vault...</span>
                  </>
                ) : (
                  <>
                    <VaultLogo className="w-4 h-4" />
                    <span>Create Vault</span>
                  </>
                )}
              </button>
              <button
                onClick={() => navigateStep(3, 'back')}
                disabled={loading}
                className="h-10 flex items-center justify-center gap-1.5 bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EEEEEE] dark:hover:bg-[#333333] rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupScreen;
