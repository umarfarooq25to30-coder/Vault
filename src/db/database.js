// Dexie.js database configuration and live instance definitions for local offline storage.

import Dexie from 'dexie';

export const db = new Dexie('VaultDB');

db.version(1).stores({
  vault_meta: '++id, key',
  items: '++id, type, folderId, isFavorite, isLocked, createdAt, updatedAt',
  folders: '++id, parentId, name',
  tags: '++id, name',
  item_tags: '++id, itemId, tagId',
  backups: '++id, createdAt'
});

// Export individual tables for convenience
export const {
  vault_meta,
  items,
  folders,
  tags,
  item_tags,
  backups
} = db;

/**
 * Checks if the vault database is ready and setup is complete.
 * @returns {Promise<boolean>}
 */
export async function isDatabaseReady() {
  try {
    const row = await db.vault_meta.where('key').equals('setup_complete').first();
    return row?.value === 'true';
  } catch (err) {
    return false;
  }
}

export async function validateAndRepairDatabase() {
  try {
    // Check if setup_complete exists
    const setupRow = await db.vault_meta
      .where('key').equals('setup_complete').first()
    
    if (!setupRow) {
      // Database is empty — fresh install, nothing to repair
      return { status: 'empty', action: 'none' }
    }
    
    // Check if salt exists
    const saltRow = await db.vault_meta
      .where('key').equals('salt').first()
    
    if (!saltRow || !saltRow.value) {
      // Setup complete flag exists but no salt
      // This is a corrupt state — clear everything
      await clearAllDatabaseData()
      return { status: 'corrupted', action: 'cleared' }
    }
    
    // Check if vault_token exists
    const tokenRow = await db.vault_meta
      .where('key').equals('vault_token').first()
    
    if (!tokenRow || 
        !tokenRow.encryptedData || 
        !tokenRow.iv) {
      // Token missing — corrupt state
      await clearAllDatabaseData()
      return { status: 'corrupted', action: 'cleared' }
    }
    
    return { status: 'healthy', action: 'none' }
    
  } catch (err) {
    // Any error during validation = corrupt
    try {
      await clearAllDatabaseData()
    } catch {
      // If even clearing fails, delete entire DB
      await deleteEntireDatabase()
    }
    return { status: 'error', action: 'cleared' }
  }
}

export async function clearAllDatabaseData() {
  // Clear all tables in correct order
  await Promise.all([
    db.vault_meta.clear(),
    db.items.clear(),
    db.folders.clear(),
    db.tags.clear(),
    db.item_tags.clear(),
    db.backups.clear(),
  ])
  
  // Clear localStorage vault keys
  const keysToRemove = [
    'vault_setup_complete',
    'vault-theme',
    'vault_failed_attempts',
    'vault_lockout_until',
  ]
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

export async function deleteEntireDatabase() {
  // Nuclear option — delete entire IndexedDB database
  // Used only when Dexie operations themselves fail
  return new Promise((resolve) => {
    // Close Dexie connection first
    db.close()
    
    const deleteReq = indexedDB.deleteDatabase('VaultDB')
    
    deleteReq.onsuccess = () => {
      // Clear localStorage too
      localStorage.clear()
      resolve(true)
    }
    
    deleteReq.onerror = () => {
      localStorage.clear()
      resolve(false)
    }
    
    deleteReq.onblocked = () => {
      // Force close all connections
      localStorage.clear()
      resolve(false)
    }
  })
}

