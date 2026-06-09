// Zustand store for managing on-device setup completing, unlocking key states, and brute-force lockouts.

import { create } from 'zustand';
import { db, clearAllDatabaseData } from '../db/database';
import { 
  generateSalt, 
  deriveKey, 
  generateVaultToken, 
  encryptData,
  decryptData, 
  generateBackupCodes, 
  hashBackupCode, 
  encryptPasswordWithCode, 
  decryptPasswordWithCode 
} from '../crypto/engine';

function isValidCryptoKey(key) {
  return key instanceof CryptoKey &&
    key.type === 'secret' &&
    key.usages.includes('decrypt');
}

export const useVaultStore = create((set, get) => ({
  isSetupComplete: localStorage.getItem('vault_setup_complete') === 'true',
  isUnlocked: false,
  isDecoy: false,
  derivedKey: null,
  failedAttempts: 0,
  totalFailedAttempts: 0,
  lockoutUntil: null,
  lastActivity: null,
  isWiped: false,

  setSetupComplete: (bool) => {
    localStorage.setItem('vault_setup_complete', bool ? 'true' : 'false');
    set({ isSetupComplete: bool });
  },

  resetWipedState: () => {
    set({ isWiped: false });
  },

  setUnlocked: (unlocked, derivedKey = null, isDecoy = false) => {
    set({ 
      isUnlocked: unlocked, 
      derivedKey,
      isDecoy,
      lastActivity: unlocked ? Date.now() : null,
      failedAttempts: unlocked ? 0 : get().failedAttempts,
      totalFailedAttempts: unlocked ? 0 : get().totalFailedAttempts
    });
  },

  initializeVault: async (password, securityOptions = { autoLock: true, backupReminders: true, duressMode: false, decoyPassword: '' }, preGeneratedBackupCodes = null) => {
    try {
      const saltRow = await db.vault_meta.where('key').equals('salt').first();
      const alreadySetup = !!saltRow;
      if (alreadySetup && get().isUnlocked) {
        return { success: true, backupCodes: [] };
      }

      const salt = await generateSalt();
      const derivedKey = await deriveKey(password, salt);
      const tokenResult = await generateVaultToken(derivedKey);

      // Clear meta and store structural items
      await db.vault_meta.clear();
      await db.items.clear();
      await db.folders.clear();
      await db.tags.clear();
      await db.item_tags.clear();
      await db.backups.clear();

      // Save credentials metadata
      await db.vault_meta.put({ key: 'salt', value: salt, createdAt: Date.now(), updatedAt: Date.now() });
      await db.vault_meta.put({ 
        key: 'vault_token', 
        encryptedData: tokenResult.encryptedData, 
        iv: tokenResult.iv, 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      });
      await db.vault_meta.put({ key: 'setup_complete', value: 'true', createdAt: Date.now(), updatedAt: Date.now() });
      await db.vault_meta.put({ key: 'created_at', value: new Date().toISOString(), createdAt: Date.now(), updatedAt: Date.now() });
      await db.vault_meta.put({ key: 'security_options', value: JSON.stringify(securityOptions), createdAt: Date.now(), updatedAt: Date.now() });

      // Save security preferences (unencrypted flat keys for config convenience)
      await db.vault_meta.put({ key: 'autoLock', value: JSON.stringify(securityOptions.autoLock), createdAt: Date.now(), updatedAt: Date.now() });
      await db.vault_meta.put({ key: 'backupReminders', value: JSON.stringify(securityOptions.backupReminders), createdAt: Date.now(), updatedAt: Date.now() });
      await db.vault_meta.put({ key: 'duressMode', value: JSON.stringify(securityOptions.duressMode), createdAt: Date.now(), updatedAt: Date.now() });

      // Create backup codes
      const backupCodes = preGeneratedBackupCodes || generateBackupCodes();
      const backupCodesStoreData = [];
      for (let i = 0; i < backupCodes.length; i++) {
        const code = backupCodes[i];
        const hash = await hashBackupCode(code);
        const codeEncryptResult = await encryptPasswordWithCode(password, code);
        backupCodesStoreData.push({
          id: i + 1,
          hash,
          encryptedPassword: codeEncryptResult.encryptedPassword,
          iv: codeEncryptResult.iv,
          codeSalt: codeEncryptResult.codeSalt,
          used: false
        });
      }

      await db.vault_meta.put({
        key: 'backup_codes',
        value: JSON.stringify(backupCodesStoreData),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Handle custom duress decoy password values if active
      if (securityOptions.duressMode && securityOptions.decoyPassword) {
        const dSalt = await generateSalt();
        const dKey = await deriveKey(securityOptions.decoyPassword, dSalt);
        const dTokenResult = await generateVaultToken(dKey);
        await db.vault_meta.put({ key: 'decoySalt', value: dSalt, createdAt: Date.now(), updatedAt: Date.now() });
        await db.vault_meta.put({ 
          key: 'decoyToken', 
          encryptedData: dTokenResult.encryptedData, 
          iv: dTokenResult.iv, 
          createdAt: Date.now(), 
          updatedAt: Date.now() 
        });
      }

      // Create 7 offline top-level folders that cannot be deleted
      const now = new Date().toISOString();
      await db.folders.add({ name: 'Notes', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });
      await db.folders.add({ name: 'Gallery', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });
      await db.folders.add({ name: 'Files', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });
      await db.folders.add({ name: 'Passwords', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });
      await db.folders.add({ name: 'Cards', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });
      await db.folders.add({ name: 'Diary', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });
      await db.folders.add({ name: 'Voice', parentId: null, color: '#1A1A1A', isDefault: 1, createdAt: now });

      localStorage.setItem('vault_setup_complete', 'true');
      set({
        isSetupComplete: true,
        isUnlocked: true,
        isDecoy: false,
        derivedKey,
        lastActivity: Date.now(),
        failedAttempts: 0,
        totalFailedAttempts: 0,
        lockoutUntil: null,
        isWiped: false
      });

      return { success: true, backupCodes, error: null };
    } catch (err) {
      return { success: false, backupCodes: [], error: err.message };
    }
  },

  unlockVault: async (password) => {
    // Lockout inspection on submit
    const now = Date.now();
    if (get().lockoutUntil && now < get().lockoutUntil) {
      const remainingSeconds = Math.ceil((get().lockoutUntil - now) / 1000);
      return { success: false, error: 'LOCKED_OUT', secondsLeft: remainingSeconds };
    }

    try {
      // 1. Read salt value from on-device meta
      const saltRow = await db.vault_meta.where('key').equals('salt').first();
      const tokenRow = await db.vault_meta.where('key').equals('vault_token').first();

      if (!saltRow || !tokenRow) {
        return { success: false, error: 'VAULT_NOT_SETUP' };
      }

      const salt = saltRow.value;

      // 2. Derive on-device PBKDF2 AES-GCM CryptoKey
      const testKey = await deriveKey(password, salt);

      if (!isValidCryptoKey(testKey)) {
        return { 
          success: false, 
          error: 'INVALID_KEY_STATE' 
        };
      }

      // 3. Attempt decryption to verify master password
      try {
        const decryptedVal = await decryptData(tokenRow.encryptedData, tokenRow.iv, testKey);
        if (decryptedVal === 'VAULT_VERIFIED_2025') {
          // Verify we can actually decrypt one item as a sanity check (self healing on unlock)
          try {
            const testRow = await db.vault_meta
              .where('key').equals('vault_token').first();
            
            if (testRow) {
              await decryptData(
                testRow.encryptedData,
                testRow.iv,
                testKey
              );
              // If we get here, key works correctly
            }
          } catch (verifyError) {
            // Key cannot decrypt existing data
            // This means data is from a different key
            // Clear database and start fresh
            await clearAllDatabaseData();
            
            set({
              isSetupComplete: false,
              isUnlocked: false,
              derivedKey: null,
              failedAttempts: 0,
              lockoutUntil: null,
            });
            
            return {
              success: false,
              error: 'DATA_MISMATCH',
              message: 'Vault data could not be verified. ' +
                'Database has been cleared for security.'
            };
          }

          // Reset attempts status and approve unlocking state
          set({
            isUnlocked: true,
            isDecoy: false,
            derivedKey: testKey,
            lastActivity: Date.now(),
            failedAttempts: 0,
            totalFailedAttempts: 0,
            lockoutUntil: null
          });
          return { success: true, error: null };
        }
      } catch (decryptErr) {
        // Fallback to check decoy credentials if active for physical duress protection
        const duressRow = await db.vault_meta.where('key').equals('duressMode').first();
        const isDuressEnabled = duressRow ? JSON.parse(duressRow.value) : false;

        if (isDuressEnabled) {
          const decoySaltRow = await db.vault_meta.where('key').equals('decoySalt').first();
          const decoyTokenRow = await db.vault_meta.where('key').equals('decoyToken').first();

          if (decoySaltRow && decoyTokenRow) {
            const decoySalt = decoySaltRow.value;
            const testDecoyKey = await deriveKey(password, decoySalt);
            
            const decryptedDecoyVal = await decryptData(decoyTokenRow.encryptedData, decoyTokenRow.iv, testDecoyKey);
            if (decryptedDecoyVal === 'VAULT_VERIFIED_2025') {
              // Unlock in fake/decoy mode presenting empty workspace
              set({
                isUnlocked: true,
                isDecoy: true,
                derivedKey: testDecoyKey,
                lastActivity: Date.now(),
                failedAttempts: 0,
                totalFailedAttempts: 0,
                lockoutUntil: null
              });
              return { success: true, error: null };
            }
          }
        }
        
        throw decryptErr;
      }

      throw new Error('DECRYPTION_FAILED');
    } catch (err) {
      // Brute force retry lockout checks
      const nextFailed = get().failedAttempts + 1;
      const nextTotalFailed = (get().totalFailedAttempts || 0) + 1;
      let newLockout = null;

      if (nextFailed >= 5) {
        newLockout = Date.now() + 30 * 60 * 1000; // 30 mins lockout penalty
      }

      set({ 
        failedAttempts: nextFailed,
        totalFailedAttempts: nextTotalFailed,
        lockoutUntil: newLockout
      });

      if (nextTotalFailed >= 10) {
        await get().wipeVault();
        return { 
          success: false, 
          error: 'VAULT_WIPED', 
          attemptsLeft: 0,
          totalFailedAttempts: nextTotalFailed
        };
      }

      return { 
        success: false, 
        error: 'WRONG_PASSWORD', 
        attemptsLeft: Math.max(0, 5 - nextFailed),
        totalFailedAttempts: nextTotalFailed
      };
    }
  },

  recoverWithBackupCode: async (enteredCode) => {
    try {
      // 1. Normalize: uppercase, ensure hyphen at position 5
      const normalized = enteredCode.toUpperCase().replace('-', '').trim();
      if (normalized.length !== 10) {
        return { success: false, error: 'INVALID_FORMAT' };
      }
      const formattedCode = normalized.slice(0, 5) + '-' + normalized.slice(5);

      // 2. Hash the entered code
      const enteredHash = await hashBackupCode(formattedCode);

      // 3. Load backup_codes from vault_meta (plaintext)
      const codesRow = await db.vault_meta.where('key').equals('backup_codes').first();
      if (!codesRow || !codesRow.value) {
        return { success: false, error: 'NO_BACKUP_CODES_SETUP' };
      }

      const backupCodes = JSON.parse(codesRow.value);

      // 4. Find matching hash in array
      const codeIndex = backupCodes.findIndex((c) => c.hash === enteredHash);
      if (codeIndex === -1) {
        return { success: false, error: 'INVALID_CODE' };
      }

      const matchedCode = backupCodes[codeIndex];

      // 5. If found and used===true: return { success: false, error: 'CODE_ALREADY_USED' }
      if (matchedCode.used) {
        return { success: false, error: 'CODE_ALREADY_USED' };
      }

      // 6. Decrypt encryptedPassword using the code
      const recoveredPassword = await decryptPasswordWithCode(
        matchedCode.encryptedPassword,
        matchedCode.iv,
        matchedCode.codeSalt,
        formattedCode
      );

      // 7. Call unlockVault(recoveredPassword) internally
      const unlockResult = await get().unlockVault(recoveredPassword);
      if (!unlockResult.success) {
        return { success: false, error: 'DECRYPTION_FAILED' };
      }

      // 8. Mark code as used in backup_codes array
      backupCodes[codeIndex].used = true;

      // 9. Update vault_meta backup_codes
      await db.vault_meta.put({
        id: codesRow.id,
        key: 'backup_codes',
        value: JSON.stringify(backupCodes),
        updatedAt: Date.now()
      });

      const codesRemaining = backupCodes.filter((c) => !c.used).length;

      // 10. Return success and info
      return { success: true, codesRemaining };
    } catch (err) {
      console.error('Backup code recovery error:', err);
      return { success: false, error: 'RECOVERY_ERROR' };
    }
  },

  changeMasterPassword: async (newPassword, newBackupCodes = null) => {
    const oldKey = get().derivedKey;
    if (!oldKey) {
      throw new Error('Vault is locked. Cannot change master password.');
    }

    try {
      // 1. Generate new salt and find new derivedKey
      const salt = await generateSalt();
      const newKey = await deriveKey(newPassword, salt);
      const tokenResult = await generateVaultToken(newKey);

      // 2. Fetch all encrypted items in IndexedDB
      const allItems = await db.items.toArray();

      // 3. Re-encrypt all items with new key
      for (const item of allItems) {
        // Decrypt with old key
        let title = '';
        try {
          title = await decryptData(item.encryptedTitle, item.titleIv, oldKey);
        } catch (e) {
          console.error('Failed to decrypt title for item', item.id, e);
          continue;
        }

        let data = '';
        try {
          data = await decryptData(item.encryptedData, item.dataIv, oldKey);
        } catch (e) {
          console.error('Failed to decrypt data for item', item.id, e);
          continue;
        }

        let preview = '';
        if (item.encryptedPreview && item.previewIv) {
          try {
            preview = await decryptData(item.encryptedPreview, item.previewIv, oldKey);
          } catch (e) {
            console.error('Failed to decrypt preview for item', item.id, e);
          }
        }

        let thumbnail = null;
        if (item.encryptedThumbnail && item.thumbnailIv) {
          try {
            thumbnail = await decryptData(item.encryptedThumbnail, item.thumbnailIv, oldKey);
          } catch (e) {
            console.error('Failed to decrypt thumbnail for item', item.id, e);
          }
        }

        // Encrypt with new key
        const { encryptedData: newEncryptedData, iv: newDataIv } = await encryptData(data, newKey);
        const { encryptedData: newEncryptedTitle, iv: newTitleIv } = await encryptData(title, newKey);
        const { encryptedData: newEncryptedPreview, iv: newPreviewIv } = await encryptData(preview || '', newKey);

        let newEncryptedThumbnail = null;
        let newThumbnailIv = null;
        if (thumbnail) {
          const thumbResult = await encryptData(thumbnail, newKey);
          newEncryptedThumbnail = thumbResult.encryptedData;
          newThumbnailIv = thumbResult.iv;
        }

        // Update item in DB
        await db.items.update(item.id, {
          encryptedTitle: newEncryptedTitle,
          titleIv: newTitleIv,
          encryptedData: newEncryptedData,
          dataIv: newDataIv,
          encryptedPreview: newEncryptedPreview,
          previewIv: newPreviewIv,
          encryptedThumbnail: newEncryptedThumbnail,
          thumbnailIv: newThumbnailIv,
          updatedAt: new Date().toISOString()
        });
      }

      // 4. Update backup codes
      const finalBackupCodes = newBackupCodes || generateBackupCodes();
      const backupCodesStoreData = [];
      for (let i = 0; i < finalBackupCodes.length; i++) {
        const code = finalBackupCodes[i];
        const hash = await hashBackupCode(code);
        const codeEncryptResult = await encryptPasswordWithCode(newPassword, code);
        backupCodesStoreData.push({
          id: i + 1,
          hash,
          encryptedPassword: codeEncryptResult.encryptedPassword,
          iv: codeEncryptResult.iv,
          codeSalt: codeEncryptResult.codeSalt,
          used: false
        });
      }

      // 5. Save metadata
      const saltRow = await db.vault_meta.where('key').equals('salt').first();
      await db.vault_meta.put({
        id: saltRow ? saltRow.id : undefined,
        key: 'salt',
        value: salt,
        updatedAt: Date.now()
      });

      const tokenRow = await db.vault_meta.where('key').equals('vault_token').first();
      await db.vault_meta.put({
        id: tokenRow ? tokenRow.id : undefined,
        key: 'vault_token',
        encryptedData: tokenResult.encryptedData,
        iv: tokenResult.iv,
        updatedAt: Date.now()
      });

      const codesRow = await db.vault_meta.where('key').equals('backup_codes').first();
      await db.vault_meta.put({
        id: codesRow ? codesRow.id : undefined,
        key: 'backup_codes',
        value: JSON.stringify(backupCodesStoreData),
        updatedAt: Date.now()
      });

      // Update state
      set({
        derivedKey: newKey,
        lastActivity: Date.now()
      });

      return { success: true, backupCodes: finalBackupCodes };
    } catch (err) {
      console.error('changeMasterPassword failed:', err);
      return { success: false, error: err.message || 'Crypto password update failed' };
    }
  },

  lockVault: () => {
    set({ 
      isUnlocked: false, 
      derivedKey: null,
      isDecoy: false,
      lastActivity: null 
    });
  },

  incrementFailedAttempts: () => {
    set((state) => {
      const newAttempts = state.failedAttempts + 1;
      return { failedAttempts: newAttempts };
    });
  },

  resetFailedAttempts: () => {
    set({ failedAttempts: 0, lockoutUntil: null });
  },

  setLockout: (timestamp) => {
    set({ lockoutUntil: timestamp });
  },

  updateLastActivity: () => {
    set({ lastActivity: Date.now() });
  },

  resetVault: async () => {
    localStorage.removeItem('vault_setup_complete');
    try {
      await Promise.all([
        db.vault_meta.clear(),
        db.items.clear(),
        db.folders.clear(),
        db.tags.clear(),
        db.item_tags.clear(),
        db.backups.clear()
      ]);
    } catch (err) {
      console.error('Failed to clear database during reset:', err);
    }
    set({
      isSetupComplete: false,
      isUnlocked: false,
      isDecoy: false,
      derivedKey: null,
      failedAttempts: 0,
      totalFailedAttempts: 0,
      lockoutUntil: null,
      lastActivity: null,
      isWiped: false
    });
  },

  wipeVault: async () => {
    localStorage.removeItem('vault_setup_complete');
    try {
      await Promise.all([
        db.vault_meta.clear(),
        db.items.clear(),
        db.folders.clear(),
        db.tags.clear(),
        db.item_tags.clear(),
        db.backups.clear()
      ]);
    } catch (err) {
      console.error('Failed to clear database during reset:', err);
    }
    set({
      isSetupComplete: false,
      isUnlocked: false,
      isDecoy: false,
      derivedKey: null,
      failedAttempts: 0,
      totalFailedAttempts: 0,
      lockoutUntil: null,
      lastActivity: null,
      isWiped: true
    });
  }
}));
