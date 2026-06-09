// Backup file format utilities

export const BACKUP_VERSION = '1.0'
export const BACKUP_EXTENSION = '.vault'
export const BACKUP_MIME =
  'application/x-vault-backup'

// Generate backup filename
export function generateBackupFilename() {
  const now = new Date()
  const date = now.toISOString()
    .split('T')[0] // 2025-01-15
  const time = now.toTimeString()
    .split(' ')[0]
    .replace(/:/g, '-') // 14-30-00
  return `vault-backup-${date}-${time}.vault`
}

// Calculate SHA-256 checksum of data
export async function calculateChecksum(data) {
  const encoded = new TextEncoder().encode(data)
  const hashBuffer = await window.crypto.subtle
    .digest('SHA-256', encoded)
  const hashArray = Array.from(
    new Uint8Array(hashBuffer)
  )
  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Validate backup file structure
export function validateBackupFile(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file format')
  }
  if (!parsed.version) {
    throw new Error('Missing version field')
  }
  if (!parsed.salt) {
    throw new Error('Missing salt — backup corrupt')
  }
  if (!parsed.encryptedPayload) {
    throw new Error('Missing encrypted data')
  }
  if (!parsed.iv) {
    throw new Error('Missing IV — backup corrupt')
  }
  return true
}

// Format backup file size
export function formatBackupSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const sizes = ['B', 'KB', 'MB', 'GB']
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${
    sizes[Math.min(i, 3)]}`
}
