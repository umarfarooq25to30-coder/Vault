// Offline-first secure storage operations using Dexie.js database and local Web Crypto API.

import { db } from './database';
import { encryptData, decryptData } from '../crypto/engine';

function assertValidKey(derivedKey, fnName) {
  if (!derivedKey) {
    throw new Error(`${fnName}: derivedKey is null. Vault may be locked.`);
  }
  if (!(derivedKey instanceof CryptoKey)) {
    throw new Error(`${fnName}: derivedKey is not a CryptoKey object. Got: ${typeof derivedKey}`);
  }
}

// ==========================================
// 1. VAULT META OPERATIONS
// ==========================================

/**
 * Save a key-value pair to vault_meta table, encrypting the value.
 * @param {string} key 
 * @param {any} value 
 * @param {CryptoKey} [derivedKey] (Optional - if key needs encryption)
 */
export async function saveVaultMeta(key, value, derivedKey) {
  const now = Date.now();
  
  if (derivedKey && key !== 'salt' && key !== 'setup_complete' && key !== 'created_at' && key !== 'security_options') {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);
    const { encryptedData, iv } = await encryptData(stringified, derivedKey);
    
    // Check if key already exists to update or add
    const existing = await db.vault_meta.where('key').equals(key).first();
    if (existing) {
      await db.vault_meta.put({
        id: existing.id,
        key,
        encryptedData,
        iv,
        updatedAt: now
      });
    } else {
      await db.vault_meta.put({
        key,
        encryptedData,
        iv,
        createdAt: now,
        updatedAt: now
      });
    }
  } else {
    // Unencrypted meta storage
    const stringifiedValue = typeof value === 'string' ? value : JSON.stringify(value);
    const existing = await db.vault_meta.where('key').equals(key).first();
    if (existing) {
      await db.vault_meta.put({
        id: existing.id,
        key,
        value: stringifiedValue,
        updatedAt: now
      });
    } else {
      await db.vault_meta.put({
        key,
        value: stringifiedValue,
        createdAt: now,
        updatedAt: now
      });
    }
  }
}

/**
 * Read a key from vault_meta and decrypt the value.
 * @param {string} key 
 * @param {CryptoKey} [derivedKey]
 * @returns {Promise<any>} Decrypted value or null
 */
export async function getVaultMeta(key, derivedKey) {
  const row = await db.vault_meta.where('key').equals(key).first();
  if (!row) return null;

  if (row.encryptedData && row.iv && derivedKey) {
    try {
      const decrypted = await decryptData(row.encryptedData, row.iv, derivedKey);
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      console.error('Failed to decrypt vault meta:', key, err);
      return null;
    }
  }

  if (row.value !== undefined) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  return null;
}

/**
 * Check if the vault has been set up (salt key exists).
 * @returns {Promise<boolean>}
 */
export async function isVaultSetup() {
  const row = await db.vault_meta.where('key').equals('salt').first();
  return !!row;
}


// ==========================================
// 2. ITEM OPERATIONS
// ==========================================

/**
 * Creates a new encrypted item.
 * @param {object} itemData 
 * @param {CryptoKey} derivedKey 
 * @returns {Promise<object>} Created decrypted item
 */
export async function createItem(itemData, derivedKey) {
  assertValidKey(derivedKey, 'createItem');
  const {
    type,
    title,
    data,
    folderId = null,
    tags = [],
    isFavorite = false,
    thumbnail = null
  } = itemData;

  const now = new Date().toISOString();

  // Encrypt the entire data payload 
  const { encryptedData, iv: dataIv } = await encryptData(data, derivedKey);

  // Extract preview text from HTML content
  let contentToExtract = '';
  if (typeof data === 'string') {
    contentToExtract = data;
  } else if (data && typeof data === 'object') {
    contentToExtract = data.content || JSON.stringify(data);
  }
  const rawPreview = contentToExtract
    ? contentToExtract
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200)
    : '';

  const { encryptedData: encryptedPreview, iv: previewIv } = await encryptData(rawPreview || '', derivedKey);
  
  // Encrypt title for local secure search purposes
  const { encryptedData: encryptedTitle, iv: titleIv } = await encryptData(title, derivedKey);

  // Encrypt thumbnail if present (base64 thumbnail or string)
  let encryptedThumbnail = null;
  let thumbnailIv = null;
  if (thumbnail) {
    const thumbResult = await encryptData(thumbnail, derivedKey);
    encryptedThumbnail = thumbResult.encryptedData;
    thumbnailIv = thumbResult.iv;
  }

  // Insert model directly into Dexie DB
  const id = await db.items.add({
    type,
    encryptedTitle,
    titleIv,
    encryptedData,
    dataIv,
    encryptedPreview,
    previewIv,
    encryptedThumbnail,
    thumbnailIv,
    folderId: folderId ? Number(folderId) : null,
    isFavorite: isFavorite ? 1 : 0, // Store as 1/0 for safe Dexie querying / compatibility
    isLocked: 0,
    lockHash: null,
    lockHint: null,
    itemPassword: null,
    createdAt: now,
    updatedAt: now,
    accessedAt: now
  });

  // Handle Tag registrations if they are defined
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      let tagRecord = await db.tags.where('name').equals(tagName).first();
      let tagId;
      if (!tagRecord) {
        tagId = await db.tags.add({ name: tagName, createdAt: now });
      } else {
        tagId = tagRecord.id;
      }
      await db.item_tags.add({ itemId: id, tagId });
    }
  }

  return {
    id,
    type,
    title,
    data,
    folderId,
    tags,
    isFavorite,
    thumbnail,
    createdAt: now,
    updatedAt: now,
    accessedAt: now
  };
}

/**
 * Retrieves and decrypts a specific item by ID.
 * @param {number} id 
 * @param {CryptoKey} derivedKey 
 * @returns {Promise<object|null>} Decrypted item or null
 */
export async function getItem(id, derivedKey) {
  assertValidKey(derivedKey, 'getItem');
  const row = await db.items.get(Number(id));
  if (!row) return null;

  try {
    const title = await decryptData(row.encryptedTitle, row.titleIv, derivedKey);
    const data = await decryptData(row.encryptedData, row.dataIv, derivedKey);
    
    let thumbnail = null;
    if (row.encryptedThumbnail && row.thumbnailIv) {
      thumbnail = await decryptData(row.encryptedThumbnail, row.thumbnailIv, derivedKey);
    }

    // Resolve tag names
    const rels = await db.item_tags.where('itemId').equals(row.id).toArray();
    const tagIds = rels.map(r => r.tagId);
    const tagRecords = await db.tags.where('id').anyOf(tagIds).toArray();
    const tagsList = tagRecords.map(t => t.name);

    // Update accessedAt in the background
    const now = new Date().toISOString();
    db.items.update(row.id, { accessedAt: now }).catch(err => {
      console.error('Failed to update accessed timestamp in background:', err);
    });

    return {
      id: row.id,
      type: row.type,
      title,
      data,
      folderId: row.folderId,
      tags: tagsList,
      isFavorite: row.isFavorite === 1,
      isLocked: row.isLocked === 1,
      lockHash: row.lockHash || null,
      lockHint: row.lockHint || null,
      thumbnail,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      accessedAt: now
    };
  } catch (err) {
    console.error('Failed to decrypt item:', id, err);
    throw new Error('DECRYPTION_FAILED');
  }
}

/**
 * Fetches all items, decrypts titles, applies search + sorting, and returns lists without heavy detail objects.
 * @param {CryptoKey} derivedKey 
 * @param {object} [filters]
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function getAllItems(derivedKey, filters = {}) {
  assertValidKey(derivedKey, 'getAllItems');
  const {
    type,
    folderId,
    isFavorite,
    searchQuery = '',
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    limit,
    offset = 0
  } = filters;

  let queryCollection;

  // Utilize the most selective DB index if applicable 
  if (type) {
    if (Array.isArray(type)) {
      queryCollection = db.items.where('type').anyOf(type);
    } else {
      queryCollection = db.items.where('type').equals(type);
    }
  } else if (folderId !== undefined && folderId !== null) {
    queryCollection = db.items.where('folderId').equals(Number(folderId));
  } else if (isFavorite !== undefined && isFavorite !== null) {
    queryCollection = db.items.where('isFavorite').equals(isFavorite ? 1 : 0);
  } else {
    queryCollection = db.items;
  }

  let results = await queryCollection.toArray();

  // Apply secondary filters in-memory
  if (type && !Array.isArray(type) && queryCollection === db.items) {
    results = results.filter(item => item.type === type);
  } else if (type && Array.isArray(type) && queryCollection === db.items) {
    results = results.filter(item => type.includes(item.type));
  }
  if (folderId !== undefined && folderId !== null && queryCollection !== db.items.where('folderId').equals(Number(folderId))) {
    results = results.filter(item => item.folderId === Number(folderId));
  }
  if (isFavorite !== undefined && isFavorite !== null && queryCollection !== db.items.where('isFavorite').equals(isFavorite ? 1 : 0)) {
    results = results.filter(item => item.isFavorite === (isFavorite ? 1 : 0));
  }

  // Decrypt titles and tags index to perform searching
  const decryptedList = [];

  for (const row of results) {
    try {
      const title = await decryptData(row.encryptedTitle, row.titleIv, derivedKey);
      
      // Resolve thumbnail if necessary
      let thumbnail = null;
      if (row.encryptedThumbnail && row.thumbnailIv) {
        thumbnail = await decryptData(row.encryptedThumbnail, row.thumbnailIv, derivedKey);
      }

      // Decrypt preview if present
      let preview = '';
      if (row.encryptedPreview && row.previewIv) {
        try {
          preview = await decryptData(row.encryptedPreview, row.previewIv, derivedKey);
        } catch {
          preview = '';
        }
      }

      // Decrypt full data payload for list cards (such as passwords metadata, username, category)
      let decryptedDataPayload = null;
      if (row.encryptedData && row.dataIv) {
        try {
          decryptedDataPayload = await decryptData(row.encryptedData, row.dataIv, derivedKey);
        } catch {
          decryptedDataPayload = null;
        }
      }

      // Resolve tag names
      const rels = await db.item_tags.where('itemId').equals(row.id).toArray();
      const tagIds = rels.map(r => r.tagId);
      const tagRecords = await db.tags.where('id').anyOf(tagIds).toArray();
      const tagsList = tagRecords.map(t => t.name);

      decryptedList.push({
        id: row.id,
        type: row.type,
        title,
        data: decryptedDataPayload,
        folderId: row.folderId,
        isFavorite: row.isFavorite === 1,
        isLocked: row.isLocked === 1,
        lockHash: row.lockHash || null,
        lockHint: row.lockHint || null,
        thumbnail,
        preview,
        tags: tagsList,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessedAt: row.accessedAt
      });
    } catch (err) {
      // Gracefully skip corrupted data items as requested, and continue without crashing
      console.warn(`Skipping decryption-failed item with index ID: ${row.id}`, err);
    }
  }

  // Filter by decrypted searchQuery
  let filtered = decryptedList;
  if (searchQuery.trim()) {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    filtered = decryptedList.filter(item => 
      item.title.toLowerCase().includes(normalizedQuery)
    );
  }

  // Apply multi-property sorting representation
  filtered.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'title') {
      valA = (valA || '').toLowerCase();
      valB = (valB || '').toLowerCase();
    } else {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = filtered.length;

  // Apply pagination limits
  let paginated = filtered;
  if (limit !== undefined && limit !== null) {
    paginated = filtered.slice(offset, offset + limit);
  }

  return {
    items: paginated,
    total
  };
}

/**
 * Updates an encrypted item with new fields.
 * @param {number} id 
 * @param {object} updates 
 * @param {CryptoKey} derivedKey 
 * @returns {Promise<object>} Updated decrypted item
 */
export async function updateItem(id, updates, derivedKey) {
  assertValidKey(derivedKey, 'updateItem');
  const row = await db.items.get(Number(id));
  if (!row) throw new Error('ITEM_NOT_FOUND');

  const now = new Date().toISOString();
  const dbUpdates = { updatedAt: now };

  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.folderId !== undefined) dbUpdates.folderId = updates.folderId ? Number(updates.folderId) : null;
  if (updates.isFavorite !== undefined) dbUpdates.isFavorite = updates.isFavorite ? 1 : 0;
  if (updates.isLocked !== undefined) dbUpdates.isLocked = updates.isLocked ? 1 : 0;
  if (updates.lockHash !== undefined) dbUpdates.lockHash = updates.lockHash;
  if (updates.lockHint !== undefined) dbUpdates.lockHint = updates.lockHint;
  if (updates.itemPassword !== undefined) dbUpdates.itemPassword = updates.itemPassword;

  // Re-encrypt updated title separately if specified
  if (updates.title !== undefined) {
    const { encryptedData, iv } = await encryptData(updates.title, derivedKey);
    dbUpdates.encryptedTitle = encryptedData;
    dbUpdates.titleIv = iv;
  }

  // Re-encrypt active payload data if specified
  if (updates.data !== undefined) {
    const { encryptedData, iv } = await encryptData(updates.data, derivedKey);
    dbUpdates.encryptedData = encryptedData;
    dbUpdates.dataIv = iv;

    // Extract updated preview text from updated HTML content
    const dataObj = updates.data;
    let contentToExtract = '';
    if (typeof dataObj === 'string') {
      contentToExtract = dataObj;
    } else if (dataObj && typeof dataObj === 'object') {
      contentToExtract = dataObj.content || JSON.stringify(dataObj);
    }
    const rawPreview = contentToExtract
      ? contentToExtract
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200)
      : '';

    const { encryptedData: encryptedPreview, iv: previewIv } = await encryptData(rawPreview || '', derivedKey);
    dbUpdates.encryptedPreview = encryptedPreview;
    dbUpdates.previewIv = previewIv;
  }

  // Re-encrypt thumbnail if specified
  if (updates.thumbnail !== undefined) {
    if (updates.thumbnail === null) {
      dbUpdates.encryptedThumbnail = null;
      dbUpdates.thumbnailIv = null;
    } else {
      const { encryptedData, iv } = await encryptData(updates.thumbnail, derivedKey);
      dbUpdates.encryptedThumbnail = encryptedData;
      dbUpdates.thumbnailIv = iv;
    }
  }

  await db.items.update(Number(id), dbUpdates);

  // Re-resolve tags relationship if updated
  if (updates.tags !== undefined) {
    // Delete old mappings
    await db.item_tags.where('itemId').equals(Number(id)).delete();
    
    for (const tagName of updates.tags) {
      let tagRecord = await db.tags.where('name').equals(tagName).first();
      let tagId;
      if (!tagRecord) {
        tagId = await db.tags.add({ name: tagName, createdAt: now });
      } else {
        tagId = tagRecord.id;
      }
      await db.item_tags.add({ itemId: Number(id), tagId });
    }
  }

  // Return full fresh decrypted item representation
  return await getItem(id, derivedKey);
}

/**
 * Permanently deletes a secure item.
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export async function deleteItem(id) {
  await db.items.delete(Number(id));
  await db.item_tags.where('itemId').equals(Number(id)).delete();
  return true;
}

/**
 * Toggles the favorite status of an item.
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export async function toggleFavorite(id) {
  const item = await db.items.get(Number(id));
  if (!item) return false;

  const freshVal = item.isFavorite === 1 ? 0 : 1;
  await db.items.update(Number(id), {
    isFavorite: freshVal,
    updatedAt: new Date().toISOString()
  });
  return true;
}

/**
 * Returns list of matching items by type with decrypted titles only.
 * @param {string} type 
 * @param {CryptoKey} derivedKey 
 * @returns {Promise<object[]>} Decrypted items array
 */
export async function getItemsByType(type, derivedKey) {
  assertValidKey(derivedKey, 'getItemsByType');
  const response = await getAllItems(derivedKey, { type });
  return response.items;
}


// ==========================================
// 3. STORAGE STATS OPERATIONS
// ==========================================

/**
 * Gathers metadata and size stats of local database content.
 * @returns {Promise<object>}
 */
export async function getStorageStats() {
  const allEntries = await db.items.toArray();
  const totalItems = allEntries.length;

  const itemsByType = {
    note: 0,
    file: 0,
    photo: 0,
    password: 0,
    card: 0,
    diary: 0,
    voice: 0,
  };

  const sizeByType = {
    note: 0,
    file: 0,
    photo: 0,
    password: 0,
    card: 0,
    diary: 0,
    voice: 0,
  };

  let estimatedSize = 0;
  let oldestDateStr = null;
  let newestDateStr = null;

  for (const item of allEntries) {
    // Increment specific counters
    itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;

    // Estimate total sizes in storage by calculating stored encrypted fields' byte length
    const sizeData = (item.encryptedData || '').length;
    const sizeTitle = (item.encryptedTitle || '').length;
    const sizeThumb = (item.encryptedThumbnail || '').length;
    const totalItemSize = sizeData + sizeTitle + sizeThumb;
    
    estimatedSize += totalItemSize;
    sizeByType[item.type] = (sizeByType[item.type] || 0) + totalItemSize;

    // Track timestamps
    const itemTime = item.createdAt;
    if (itemTime) {
      if (!oldestDateStr || itemTime < oldestDateStr) {
        oldestDateStr = itemTime;
      }
      if (!newestDateStr || itemTime > newestDateStr) {
        newestDateStr = itemTime;
      }
    }
  }

  // Query latest backup timestamp
  const lastBackupRecord = await db.backups.orderBy('createdAt').last();
  const lastBackup = lastBackupRecord ? lastBackupRecord.createdAt : null;

  return {
    totalItems,
    itemsByType,
    sizeByType,
    estimatedSize,
    lastBackup,
    oldestItem: oldestDateStr,
    newestItem: newestDateStr,
  };
}


// ==========================================
// 4. FOLDER OPERATIONS (Plaintexts tags and categories)
// ==========================================

/**
 * Creates folders structure.
 * @param {string} name 
 * @param {number|null} parentId 
 * @param {string} [color] 
 * @param {boolean} [isDefault=false]
 * @returns {Promise<number>} ID of newly created folder
 */
export async function createFolder(name, parentId = null, color = '#888888', isDefault = false) {
  const now = new Date().toISOString();
  return await db.folders.add({
    name,
    parentId: parentId ? Number(parentId) : null,
    color,
    isDefault: isDefault ? 1 : 0,
    createdAt: now
  });
}

/**
 * Fetch all flat folders list.
 * @returns {Promise<object[]>}
 */
export async function getFolders() {
  const list = await db.folders.toArray();
  return list.map(f => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    color: f.color || '#888888',
    isDefault: f.isDefault === 1,
    createdAt: f.createdAt
  }));
}

/**
 * Compiles custom folders flat tree structures hierarchical representation.
 * @returns {Promise<object[]>}
 */
export async function getFolderTree() {
  const allFolders = await getFolders();
  const folderMap = {};

  allFolders.forEach(f => {
    folderMap[f.id] = { ...f, children: [] };
  });

  const rootNodes = [];
  allFolders.forEach(f => {
    if (f.parentId && folderMap[f.parentId]) {
      folderMap[f.parentId].children.push(folderMap[f.id]);
    } else {
      rootNodes.push(folderMap[f.id]);
    }
  });

  return rootNodes;
}

/**
 * Updates folder configurations
 * @param {number} id 
 * @param {object} updates 
 */
export async function updateFolder(id, updates) {
  const cleanUpdates = {};
  if (updates.name !== undefined) cleanUpdates.name = updates.name;
  if (updates.parentId !== undefined) cleanUpdates.parentId = updates.parentId ? Number(updates.parentId) : null;
  if (updates.color !== undefined) cleanUpdates.color = updates.color;

  await db.folders.update(Number(id), cleanUpdates);
}

/**
 * Deletes folder, moving items to parentId (or null if top-level flat category)
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export async function getFileCountsByFolder(types = ['file', 'photo', 'video']) {
  const items = await db.items.where('type').anyOf(types).toArray();
  const counts = { total: items.length };
  
  items.forEach(item => {
    if (item.folderId != null) {
      counts[item.folderId] = (counts[item.folderId] || 0) + 1;
    } else {
      counts.root = (counts.root || 0) + 1;
    }
  });
  
  return counts;
}

export async function deleteFolder(id) {
  const folder = await db.folders.get(Number(id));
  if (!folder) return false;
  
  // We do not let users delete a default folder
  if (folder.isDefault === 1) {
    throw new Error('DEFAULT_FOLDER_PROTECTED');
  }

  const targetParent = folder.parentId ? Number(folder.parentId) : null;

  // Move matching items to parent folder
  await db.items.where('folderId').equals(Number(id)).modify({ folderId: targetParent });

  // Reparent all children sub-folders
  await db.folders.where('parentId').equals(Number(id)).modify({ parentId: targetParent });

  // Perform actual deletion
  await db.folders.delete(Number(id));
  return true;
}
