import { useState, useCallback } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import { db } from '../db/database'
import { deriveKey, encryptData, decryptData } from '../crypto/engine'
import {
  BACKUP_VERSION,
  generateBackupFilename,
  calculateChecksum,
  validateBackupFile,
  formatBackupSize,
} from '../utils/backupUtils'

export function useBackup() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0) // 0-100

  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importFile, setImportFile] = useState(null)
  // { name, size, parsed } — file info before restore

  const [importPassword, setImportPassword] = useState('')
  const [importStep, setImportStep] = useState('select')
  // 'select' | 'preview' | 'password' | 'restoring' | 'done' | 'error'

  const [importInfo, setImportInfo] = useState(null)
  // { createdAt, itemCount, version, size }

  const [importError, setImportError] = useState('')
  const [restoreMode, setRestoreMode] = useState('full') // 'full' | 'merge'

  const [backupHistory, setBackupHistory] = useState([])

  // ── LOAD BACKUP HISTORY ───────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const records = await db.backups
        .orderBy('createdAt')
        .reverse()
        .toArray()
      setBackupHistory(records)
    } catch (err) {
      console.error('loadHistory:', err)
    }
  }, [])

  // ── EXPORT (Create Backup) ────────────────────
  const exportBackup = useCallback(async () => {
    if (!derivedKey) return
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Step 1: Read all data from IndexedDB
      setExportProgress(10)

      const [vaultMeta, items, folders, tags, itemTags] = await Promise.all([
        db.vault_meta.toArray(),
        db.items.toArray(),
        db.folders.toArray(),
        db.tags.toArray(),
        db.item_tags.toArray(),
      ])

      setExportProgress(30)

      // Step 2: Build payload object
      const payload = {
        exportedAt: new Date().toISOString(),
        vaultMeta,
        items,
        folders,
        tags,
        itemTags,
      }

      const payloadString = JSON.stringify(payload)

      setExportProgress(50)

      // Step 3: Calculate checksum before encrypting
      const checksum = await calculateChecksum(payloadString)

      // Step 4: Get salt from vault_meta
      const saltRow = vaultMeta.find(r => r.key === 'salt')
      if (!saltRow?.value) {
        throw new Error('Vault salt not found')
      }

      // Step 5: Encrypt the entire payload
      const { encryptedData, iv } = await encryptData(payloadString, derivedKey)

      setExportProgress(80)

      // Step 6: Build .vault file object
      const backupFile = {
        version: BACKUP_VERSION,
        app: 'Vault',
        createdAt: new Date().toISOString(),
        itemCount: items.length,
        checksum,
        salt: saltRow.value,
        encryptedPayload: encryptedData,
        iv,
      }

      const backupJSON = JSON.stringify(backupFile, null, 2)
      const backupSize = new Blob([backupJSON]).size

      // Step 7: Trigger download
      const blob = new Blob([backupJSON], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateBackupFilename()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)

      setExportProgress(100)

      // Step 8: Record backup in history
      await db.backups.add({
        createdAt: new Date().toISOString(),
        itemCount: items.length,
        size: backupSize,
        filename: a.download,
      })

      await loadHistory()

      addToast({
        variant: 'success',
        title: 'Backup created',
        description: `${items.length} items · ${formatBackupSize(backupSize)}`,
        duration: 5000,
      })

    } catch (err) {
      console.error('exportBackup failed:', err)
      addToast({
        variant: 'danger',
        title: 'Backup failed',
        description: err.message,
      })
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 1000)
    }
  }, [derivedKey, loadHistory, addToast])

  // ── SELECT BACKUP FILE ────────────────────────
  const selectBackupFile = useCallback(async (file) => {
    setImportError('')
    setImportStep('select')

    if (!file) return

    if (!file.name.endsWith('.vault') && !file.name.endsWith('.json')) {
      setImportError('Please select a .vault backup file')
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      validateBackupFile(parsed)

      setImportFile({
        name: file.name,
        size: file.size,
        parsed,
      })

      setImportInfo({
        version: parsed.version || '1.0',
        createdAt: parsed.createdAt,
        itemCount: parsed.itemCount || 0,
        size: file.size,
      })

      setImportStep('preview')

    } catch (err) {
      setImportError('Invalid backup file: ' + err.message)
      setImportFile(null)
    }
  }, [])

  // ── RESTORE BACKUP ────────────────────────────
  const restoreBackup = useCallback(async () => {
    if (!importFile?.parsed || !importPassword) return

    setImportStep('restoring')
    setImportProgress(0)
    setImportError('')

    try {
      const { parsed } = importFile

      // Step 1: Derive key from entered password
      setImportProgress(10)
      const restoreKey = await deriveKey(importPassword, parsed.salt)

      // Step 2: Decrypt the payload
      setImportProgress(25)
      let payloadString
      try {
        payloadString = await decryptData(parsed.encryptedPayload, parsed.iv, restoreKey)
      } catch {
        throw new Error('Wrong password. Please enter the password you used when this vault was set up.')
      }

      if (typeof payloadString === 'object') {
        payloadString = JSON.stringify(payloadString)
      }

      // Step 3: Verify checksum
      setImportProgress(40)
      if (parsed.checksum) {
        const checksum = await calculateChecksum(payloadString)
        if (checksum !== parsed.checksum) {
          throw new Error('Backup file is corrupted. Checksum mismatch.')
        }
      }

      // Step 4: Parse payload
      const payload = typeof payloadString === 'string' ? JSON.parse(payloadString) : payloadString

      setImportProgress(50)

      if (restoreMode === 'full') {
        await db.transaction('rw', db.vault_meta, db.items, db.folders, db.tags, db.item_tags, async () => {
          await Promise.all([
            db.vault_meta.clear(),
            db.items.clear(),
            db.folders.clear(),
            db.tags.clear(),
            db.item_tags.clear(),
          ])

          setImportProgress(65)
          if (payload.vaultMeta?.length) await db.vault_meta.bulkAdd(payload.vaultMeta)

          setImportProgress(75)
          if (payload.items?.length) await db.items.bulkAdd(payload.items)

          setImportProgress(85)
          if (payload.folders?.length) await db.folders.bulkAdd(payload.folders)
          if (payload.tags?.length) await db.tags.bulkAdd(payload.tags)
          if (payload.itemTags?.length) await db.item_tags.bulkAdd(payload.itemTags)
        })

        localStorage.setItem('vault_setup_complete', 'true')
      } else {
        setImportProgress(65)

        const currentSalt = await db.vault_meta.where('key').equals('salt').first()
        if (currentSalt?.value !== parsed.salt) {
          throw new Error('Merge requires same master password. The backup was created with a different password. Use Full Restore instead.')
        }

        const existingItems = await db.items.toArray()
        const existingIds = new Set(existingItems.map(i => i.id))

        const newItems = (payload.items || []).filter(item => !existingIds.has(item.id))

        setImportProgress(80)
        if (newItems.length > 0) {
          await db.items.bulkAdd(newItems)
        }

        const existingFolders = await db.folders.toArray()
        const existingFolderIds = new Set(existingFolders.map(f => f.id))
        const newFolders = (payload.folders || []).filter(f => !existingFolderIds.has(f.id))
        if (newFolders.length > 0) {
          await db.folders.bulkAdd(newFolders)
        }

        setImportProgress(90)
      }

      await db.backups.add({
        createdAt: new Date().toISOString(),
        itemCount: payload.items?.length || 0,
        size: importFile.size,
        filename: importFile.name,
        type: 'restore',
      })

      await loadHistory()

      setImportProgress(100)
      setImportStep('done')

    } catch (err) {
      console.error('restoreBackup failed:', err)
      setImportError(err.message)
      setImportStep('error')
    }
  }, [importFile, importPassword, restoreMode, loadHistory])

  const resetImport = () => {
    setImportFile(null)
    setImportInfo(null)
    setImportPassword('')
    setImportStep('select')
    setImportError('')
    setImportProgress(0)
  }

  return {
    isExporting, exportProgress, exportBackup,
    isImporting, importProgress, importFile, importInfo,
    importPassword, importStep, importError, restoreMode,
    setImportPassword, setRestoreMode, selectBackupFile,
    restoreBackup, resetImport,
    backupHistory, loadHistory, formatBackupSize,
  }
}
