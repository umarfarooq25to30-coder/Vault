// Custom React hook connecting components securely to the Zustand vaultStore state-machine.

import { useVaultStore } from '../store/vaultStore';

export function useVault() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const isSetupComplete = useVaultStore((state) => state.isSetupComplete);
  const derivedKey = useVaultStore((state) => state.derivedKey);
  const failedAttempts = useVaultStore((state) => state.failedAttempts);
  const lockoutUntil = useVaultStore((state) => state.lockoutUntil);

  const initializeVault = useVaultStore((state) => state.initializeVault);
  const unlockVault = useVaultStore((state) => state.unlockVault);
  const lockVault = useVaultStore((state) => state.lockVault);

  const isLockedOut = lockoutUntil ? lockoutUntil > Date.now() : false;
  const lockoutSecondsLeft = lockoutUntil ? Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000)) : 0;
  const canAttemptUnlock = !isLockedOut;

  return {
    isUnlocked,
    isSetupComplete,
    derivedKey,
    failedAttempts,
    lockoutUntil,

    initializeVault,
    unlockVault,
    lockVault,

    isLockedOut,
    lockoutSecondsLeft,
    canAttemptUnlock,
  };
}
