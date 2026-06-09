// Utility functions and constants for secure payment card configuration and validation.

export function detectCardType(number) {
  const n = (number || '').replace(/\D/g, '')
  if (!n) return 'other'
  
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^(6011|65|64[4-9]|622)/.test(n)) {
    return 'discover'
  }
  if (/^62/.test(n)) return 'unionpay'
  if (/^(508[5-9]|60698|607|608|60[6-9])/.test(n)) {
    return 'rupay'
  }
  return 'other'
}

export function getCardTypeLabel(type) {
  const labels = {
    visa: 'VISA',
    mastercard: 'MASTERCARD',
    amex: 'AMEX',
    discover: 'DISCOVER',
    unionpay: 'UNIONPAY',
    rupay: 'RuPay',
    other: '',
  }
  return labels[type] || ''
}

export function formatCardNumber(value, type) {
  const digits = value.replace(/\D/g, '')
  
  if (type === 'amex') {
    const maxLen = 15
    const d = digits.slice(0, maxLen)
    if (d.length <= 4) return d
    if (d.length <= 10) {
      return `${d.slice(0, 4)} ${d.slice(4)}`
    }
    return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`
  }
  
  const maxLen = 16
  const d = digits.slice(0, maxLen)
  const groups = []
  for (let i = 0; i < d.length; i += 4) {
    groups.push(d.slice(i, i + 4))
  }
  return groups.join(' ')
}

export function maskCardNumber(number, type) {
  const digits = (number || '').replace(/\D/g, '')
  
  if (type === 'amex') {
    if (digits.length < 15) {
      return '•••• •••••• •••••'
    }
    return `${digits.slice(0, 4)} ••••••  ${digits.slice(10)}`
  }
  
  if (digits.length < 16) {
    return '•••• •••• •••• ••••'
  }
  return `${digits.slice(0, 4)} •••• •••• ${digits.slice(12)}`
}

export function formatExpiry(value) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`
}

export function isExpiryValid(expiry) {
  const [month, year] = (expiry || '').split('/')
  if (!month || !year) return false
  const m = parseInt(month, 10)
  const y = parseInt(year, 10) + 2000
  if (m < 1 || m > 12) return false
  
  const now = new Date()
  const exp = new Date(y, m - 1, 1)
  const currentFirstOf = new Date(now.getFullYear(), now.getMonth(), 1)
  return exp >= currentFirstOf
}

export function isCardExpired(expiry) {
  if (!expiry) return false
  return !isExpiryValid(expiry)
}

export function isCardExpiringSoon(expiry) {
  if (!expiry) return false
  const [month, year] = expiry.split('/')
  if (!month || !year) return false
  const m = parseInt(month, 10)
  const y = parseInt(year, 10) + 2000
  if (m < 1 || m > 12) return false

  // Last day of the specified month
  const expiryDate = new Date(y, m, 0)
  const today = new Date()
  
  // Clean up times
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(23, 59, 59, 999)

  const diffTime = expiryDate.getTime() - today.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)

  // Expiring soon if not already expired, and is within 30 days
  return diffDays >= 0 && diffDays <= 30
}

export const CARD_GRADIENTS = [
  { 
    id: 'midnight',
    label: 'Midnight',
    bg: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
    text: '#F0F0F0',
    subtext: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'gold',
    label: 'Gold',
    bg: 'linear-gradient(135deg, #B8860B, #DAA520, #FFD700)',
    text: '#1A1A1A',
    subtext: 'rgba(0,0,0,0.5)',
  },
  {
    id: 'silver',
    label: 'Silver',
    bg: 'linear-gradient(135deg, #6E6E6E, #A8A8A8, #D8D8D8)',
    text: '#1A1A1A',
    subtext: 'rgba(0,0,0,0.4)',
  },
  {
    id: 'rose',
    label: 'Rose',
    bg: 'linear-gradient(135deg, #8B0000, #C41E3A, #FF6B6B)',
    text: '#F0F0F0',
    subtext: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    bg: 'linear-gradient(135deg, #0077B6, #00B4D8, #90E0EF)',
    text: '#F0F0F0',
    subtext: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'forest',
    label: 'Forest',
    bg: 'linear-gradient(135deg, #1B4332, #2D6A4F, #52B788)',
    text: '#F0F0F0',
    subtext: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'purple',
    label: 'Purple',
    bg: 'linear-gradient(135deg, #3A0CA3, #7209B7, #F72585)',
    text: '#F0F0F0',
    subtext: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'black',
    label: 'Black',
    bg: 'linear-gradient(135deg, #0D0D0D, #1A1A1A, #2A2A2A)',
    text: '#F0F0F0',
    subtext: 'rgba(255,255,255,0.4)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    bg: 'linear-gradient(135deg, #F77F00, #FCBF49, #EAE2B7)',
    text: '#1A1A1A',
    subtext: 'rgba(0,0,0,0.4)',
  },
  {
    id: 'arctic',
    label: 'Arctic',
    bg: 'linear-gradient(135deg, #CAF0F8, #90E0EF, #00B4D8)',
    text: '#0D1B2A',
    subtext: 'rgba(0,0,0,0.4)',
  },
]

export const CARD_CATEGORIES = [
  { id: 'credit',  label: 'Credit Card' },
  { id: 'debit',   label: 'Debit Card' },
  { id: 'prepaid', label: 'Prepaid Card' },
  { id: 'virtual', label: 'Virtual Card' },
]

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
    .catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
}
