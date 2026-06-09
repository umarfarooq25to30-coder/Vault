// Cryptographic operations engine implementing AES-256-GCM encryption, PBKDF2 hash derivation, and password strength evaluation using Web Crypto API.

// ─── PRIVATE HELPERS ──────────────────────────────

function arrayBufferToBase64(buffer) {
  // Convert ArrayBuffer or Uint8Array to base64 string
  // This implementation works correctly in all browsers
  // including Safari, Firefox, Chrome, and WebViews
  const bytes = buffer instanceof Uint8Array
    ? buffer
    : new Uint8Array(buffer)
    
  let binary = ''
  const len = bytes.byteLength
  
  // Process in chunks to avoid stack overflow
  // on very large files (important for video/photo/file attachments)
  const chunkSize = 8192
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(
      i, Math.min(i + chunkSize, len)
    )
    binary += String.fromCharCode.apply(null, chunk)
  }
  
  return btoa(binary)
}

function base64ToUint8Array(base64) {
  // Convert base64 string back to Uint8Array
  // Handles padding and whitespace correctly
  
  // Remove any whitespace (newlines, spaces)
  // that might have been added during storage
  const cleaned = base64
    .replace(/\s/g, '')
    .replace(/-/g, '+')   // handle URL-safe base64
    .replace(/_/g, '/')   // handle URL-safe base64
  
  // Add padding if missing
  const padded = cleaned + '=='.slice(
    0, (4 - cleaned.length % 4) % 4
  )
  
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  
  return bytes
}

// ─── EXPORTS ──────────────────────────────────────
// Export helpers so other modules can use them
export { arrayBufferToBase64, base64ToUint8Array }

// ─── SALT ─────────────────────────────────────────

export async function generateSalt() {
  const saltBytes = window.crypto.getRandomValues(
    new Uint8Array(32)
  )
  return arrayBufferToBase64(saltBytes)
}

// ─── KEY DERIVATION ───────────────────────────────

export async function deriveKey(password, salt) {
  if (!password || typeof password !== 'string') {
    throw new Error('INVALID_PASSWORD')
  }
  if (!salt || typeof salt !== 'string') {
    throw new Error('INVALID_SALT')
  }
  
  const passwordBytes = new TextEncoder()
    .encode(password)
  
  const saltBytes = base64ToUint8Array(salt)
  
  // Step 1: Import password as raw key material
  const keyMaterial = await window.crypto.subtle
    .importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
  
  // Step 2: Derive AES-256-GCM key
  // 310,000 iterations = OWASP 2024 recommendation
  const derivedKey = await window.crypto.subtle
    .deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 310000,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,           // non-extractable for security
      ['encrypt', 'decrypt']
    )
  
  return derivedKey
}

// ─── ENCRYPT TEXT / OBJECT ────────────────────────

export async function encryptData(data, derivedKey) {
  if (!derivedKey) {
    throw new Error('ENCRYPT_ERROR: No key provided')
  }
  if (!(derivedKey instanceof CryptoKey)) {
    throw new Error(
      'ENCRYPT_ERROR: derivedKey must be CryptoKey, ' +
      'got: ' + typeof derivedKey
    )
  }
  
  // Serialize data to string
  const plaintext = typeof data === 'string'
    ? data
    : JSON.stringify(data)
  
  // Encode string to bytes
  const plaintextBytes = new TextEncoder()
    .encode(plaintext)
  
  // Generate unique IV for every single encryption
  // NEVER reuse an IV with the same key
  const iv = window.crypto.getRandomValues(
    new Uint8Array(12) // 96-bit IV for AES-GCM
  )
  
  // Encrypt
  const encryptedBuffer = await window.crypto.subtle
    .encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        // tagLength: 128 (default, most secure)
      },
      derivedKey,
      plaintextBytes
    )
  
  // Convert both to base64 for storage in IndexedDB
  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
    // Note: iv is stored as ArrayBuffer-derived base64
    // NOT as iv.buffer — this was a common bug source in older engines
  }
}

// ─── DECRYPT TEXT / OBJECT ────────────────────────

export async function decryptData(
  encryptedData, iv, derivedKey
) {
  if (!derivedKey) {
    throw new Error('DECRYPT_ERROR: No key provided')
  }
  if (!(derivedKey instanceof CryptoKey)) {
    throw new Error(
      'DECRYPT_ERROR: derivedKey must be CryptoKey'
    )
  }
  if (!encryptedData) {
    throw new Error('DECRYPT_ERROR: No encrypted data')
  }
  if (!iv) {
    throw new Error('DECRYPT_ERROR: No IV provided')
  }
  
  // Convert base64 back to bytes
  const encryptedBytes = base64ToUint8Array(encryptedData)
  const ivBytes = base64ToUint8Array(iv)
  
  // Decrypt
  let decryptedBuffer
  try {
    decryptedBuffer = await window.crypto.subtle
      .decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes,
        },
        derivedKey,
        encryptedBytes
      )
  } catch (cryptoError) {
    // Do not expose crypto internals in error message
    throw new Error('DECRYPTION_FAILED')
  }
  
  // Decode bytes to string
  const decoded = new TextDecoder().decode(decryptedBuffer)
  
  // Try to parse as JSON — return object if possible
  // Return raw string otherwise
  try {
    return JSON.parse(decoded)
  } catch {
    return decoded
  }
}

// ─── ENCRYPT BINARY FILE ──────────────────────────

export async function encryptFile(
  arrayBuffer, derivedKey
) {
  if (!derivedKey || !(derivedKey instanceof CryptoKey)) {
    throw new Error('ENCRYPT_FILE_ERROR: Invalid key')
  }
  if (!arrayBuffer) {
    throw new Error('ENCRYPT_FILE_ERROR: No data')
  }
  
  const iv = window.crypto.getRandomValues(
    new Uint8Array(12)
  )
  
  const encryptedBuffer = await window.crypto.subtle
    .encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      arrayBuffer   // pass ArrayBuffer directly
    )
  
  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
  }
}

// ─── DECRYPT BINARY FILE ─────────────────────────

export async function decryptFile(
  encryptedData, iv, derivedKey
) {
  if (!derivedKey || !(derivedKey instanceof CryptoKey)) {
    throw new Error('DECRYPT_FILE_ERROR: Invalid key')
  }
  
  const encryptedBytes = base64ToUint8Array(encryptedData)
  const ivBytes = base64ToUint8Array(iv)
  
  let decryptedBuffer
  try {
    decryptedBuffer = await window.crypto.subtle
      .decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        derivedKey,
        encryptedBytes
      )
  } catch {
    throw new Error('DECRYPTION_FAILED')
  }
  
  return decryptedBuffer // return raw ArrayBuffer
}

// ─── VAULT VERIFICATION TOKEN ─────────────────────

export async function generateVaultToken(derivedKey) {
  // Encrypt a known string to verify password later
  const verificationString = 'VAULT_VERIFIED_2025'
  return await encryptData(verificationString, derivedKey)
}

// ─── PASSWORD STRENGTH ────────────────────────────

export function verifyPasswordStrength(password) {
  if (!password || password.length === 0) {
    return { score: 0, label: 'Too weak', 
             color: '#EF4444' }
  }
  
  let score = 0
  
  // Length checks
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  
  // Character variety
  if (/[A-Z]/.test(password) && 
      /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  // Cap at 4
  score = Math.min(4, score)
  
  const levels = [
    { label: 'Too weak',  color: '#EF4444' },
    { label: 'Weak',      color: '#F97316' },
    { label: 'Fair',      color: '#EAB308' },
    { label: 'Good',      color: '#22C55E' },
    { label: 'Strong',    color: '#16A34A' },
  ]
  
  return { score, ...levels[score] }
}

// ─── BACKUP CODE SYSTEM ───────────────────────────

export async function generateBackupCodes() {
  // Characters that cannot be confused visually
  // No 0/O, no 1/I/l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codes = []
  
  for (let i = 0; i < 8; i++) {
    const randomBytes = window.crypto.getRandomValues(
      new Uint8Array(10)
    )
    let code = ''
    for (let j = 0; j < 10; j++) {
      if (j === 5) {
        code += '-'
      }
      code += chars[randomBytes[j] % chars.length]
    }
    codes.push(code)
  }
  
  return codes
}

export async function hashBackupCode(code) {
  // Normalize: uppercase, remove hyphen and spaces
  const normalized = code
    .toUpperCase()
    .replace(/[-\s]/g, '')
    .trim()
  
  const encoded = new TextEncoder().encode(normalized)
  
  const hashBuffer = await window.crypto.subtle
    .digest('SHA-256', encoded)
  
  return arrayBufferToBase64(hashBuffer)
}

export async function encryptPasswordWithCode(
  masterPassword, backupCode
) {
  // Generate a unique salt for this specific code
  const codeSalt = await generateSalt()
  
  // Normalize the backup code
  const normalizedCode = backupCode
    .toUpperCase()
    .replace(/[-\s]/g, '')
  
  // Derive a key from the backup code
  const codeKey = await deriveKey(
    normalizedCode, codeSalt
  )
  
  // Encrypt the master password with this key
  const { encryptedData, iv } = await encryptData(
    masterPassword, codeKey
  )
  
  return { encryptedData, encryptedPassword: encryptedData, iv, codeSalt }
}

export async function decryptPasswordWithCode(
  encryptedData, iv, codeSalt, backupCode
) {
  // Normalize the backup code same way as encryption
  const normalizedCode = backupCode
    .toUpperCase()
    .replace(/[-\s]/g, '')
  
  // Derive same key from code + stored salt
  const codeKey = await deriveKey(
    normalizedCode, codeSalt
  )
  
  // Decrypt and return the master password
  return await decryptData(encryptedData, iv, codeKey)
}
