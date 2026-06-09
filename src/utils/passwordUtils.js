// Password utility functions
// Zero dependencies — pure JavaScript

// ── STRENGTH CHECKER ──────────────────────────────

export function checkPasswordStrength(password) {
  if (!password || password.length === 0) {
    return { 
      score: 0, 
      label: 'No password', 
      color: '#444444',
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
      }
    }
  }

  const checks = {
    length: password.length >= 8,
    longLength: password.length >= 16,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password),
  }

  let score = 0
  if (checks.length) score++
  if (checks.longLength) score++
  if (checks.uppercase && checks.lowercase) score++
  if (checks.numbers) score++
  if (checks.symbols) score++
  score = Math.min(4, score)

  const levels = [
    { label: 'Very weak', color: '#EF4444' },
    { label: 'Weak',      color: '#F97316' },
    { label: 'Fair',      color: '#EAB308' },
    { label: 'Good',      color: '#22C55E' },
    { label: 'Strong',    color: '#16A34A' },
  ]

  return { 
    score, 
    ...levels[score],
    checks 
  }
}

// ── PASSWORD GENERATOR ────────────────────────────

export function generatePassword(options = {}) {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false,
    // Excludes: 0,O,l,1,I
  } = options

  let charset = ''
  
  const UPPERCASE = excludeAmbiguous
    ? 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  const LOWERCASE = excludeAmbiguous
    ? 'abcdefghjkmnpqrstuvwxyz'
    : 'abcdefghijklmnopqrstuvwxyz'
  
  const NUMBERS = excludeAmbiguous
    ? '23456789'
    : '0123456789'
  
  const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

  if (uppercase) charset += UPPERCASE
  if (lowercase) charset += LOWERCASE
  if (numbers)   charset += NUMBERS
  if (symbols)   charset += SYMBOLS

  if (!charset) charset = LOWERCASE + NUMBERS

  // Use crypto.getRandomValues for true randomness
  const array = new Uint32Array(length)
  window.crypto.getRandomValues(array)
  
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }

  // Ensure at least one char from each enabled set
  // Replace random positions with guaranteed chars
  const guaranteed = []
  const guaranteedArrays = new Uint32Array(4)
  window.crypto.getRandomValues(guaranteedArrays)

  if (uppercase && charset.includes(UPPERCASE[0])) {
    guaranteed.push({
      char: UPPERCASE[
        guaranteedArrays[0] % UPPERCASE.length
      ],
      pos: Math.floor(length * 0.25)
    })
  }
  if (lowercase && charset.includes(LOWERCASE[0])) {
    guaranteed.push({
      char: LOWERCASE[
        guaranteedArrays[1] % LOWERCASE.length
      ],
      pos: Math.floor(length * 0.5)
    })
  }
  if (numbers) {
    guaranteed.push({
      char: NUMBERS[
        guaranteedArrays[2] % NUMBERS.length
      ],
      pos: Math.floor(length * 0.75)
    })
  }
  if (symbols) {
    guaranteed.push({
      char: SYMBOLS[
        guaranteedArrays[3] % SYMBOLS.length
      ],
      pos: Math.floor(length * 0.9)
    })
  }

  const pwArr = password.split('')
  guaranteed.forEach(({ char, pos }) => {
    pwArr[pos] = char
  })

  return pwArr.join('')
}

// ── PASSPHRASE GENERATOR ──────────────────────────

const WORDLIST = [
  'apple','bridge','castle','dragon','eagle',
  'forest','garden','harbor','island','jungle',
  'knight','lemon','mountain','needle','ocean',
  'palace','queen','river','sunset','tower',
  'umbrella','valley','winter','yellow','zebra',
  'anchor','butter','candle','diamond','engine',
  'falcon','golden','helmet','iron','jasmine',
  'kettle','lantern','marble','noble','orbit',
  'pepper','quartz','rocket','silver','tiger',
  'unique','violet','walnut','xenon','yarn',
]

export function generatePassphrase(options = {}) {
  const {
    wordCount = 4,
    separator = '-',
    capitalize = true,
    includeNumber = true,
  } = options

  const array = new Uint32Array(wordCount + 1)
  window.crypto.getRandomValues(array)

  let words = []
  for (let i = 0; i < wordCount; i++) {
    let word = WORDLIST[array[i] % WORDLIST.length]
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + 
        word.slice(1)
    }
    words.push(word)
  }

  if (includeNumber) {
    const num = array[wordCount] % 100
    words.push(String(num))
  }

  return words.join(separator)
}

// ── URL HELPERS ───────────────────────────────────

export function extractDomain(url) {
  if (!url) return ''
  try {
    const u = url.includes('://') 
      ? url 
      : `https://${url}`
    return new URL(u).hostname
      .replace('www.', '')
  } catch {
    return url
  }
}

export function extractCleanDomain(url, siteName) {
  let text = (url || '').trim()
  if (!text) {
    const site = (siteName || '').trim()
    if (site.includes('.') && !site.includes(' ')) {
      text = site
    } else if (site) {
      const lower = site.toLowerCase()
      if (lower === 'gmail' || lower === 'google mail') return 'gmail.com'
      if (lower === 'netflix') return 'netflix.com'
      if (lower === 'github') return 'github.com'
      if (lower === 'google') return 'google.com'
      if (lower === 'facebook') return 'facebook.com'
      if (lower === 'twitter' || lower === 'x') return 'twitter.com'
      if (lower === 'youtube') return 'youtube.com'
      if (lower === 'outlook' || lower === 'hotmail') return 'outlook.com'
      if (lower === 'microsoft') return 'microsoft.com'
      if (lower === 'amazon') return 'amazon.com'
      if (lower === 'apple') return 'apple.com'
    }
  }

  if (!text) return ''
  
  try {
    const u = text.includes('://') ? text : `https://${text}`
    const hostname = new URL(u).hostname
    return hostname.replace('www.', '')
  } catch {
    return text.replace('www.', '')
  }
}

export function getFaviconUrl(url, siteName) {
  const domain = extractCleanDomain(url, siteName)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
}

// ── CATEGORIES ────────────────────────────────────

export const PASSWORD_CATEGORIES = [
  { id: 'social',        label: 'Social',        
    color: '#3B82F6' },
  { id: 'work',          label: 'Work',          
    color: '#8B5CF6' },
  { id: 'finance',       label: 'Finance',       
    color: '#22C55E' },
  { id: 'shopping',      label: 'Shopping',      
    color: '#F97316' },
  { id: 'entertainment', label: 'Entertainment', 
    color: '#EC4899' },
  { id: 'gaming',        label: 'Gaming',        
    color: '#EF4444' },
  { id: 'other',         label: 'Other',         
    color: '#888888' },
]

export function getCategoryColor(categoryId) {
  return PASSWORD_CATEGORIES.find(
    c => c.id === categoryId
  )?.color || '#888888'
}

// ── COPY TO CLIPBOARD ─────────────────────────────

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}
