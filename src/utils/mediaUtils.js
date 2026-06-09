// Media utilities — type detection, thumbnails, compression, URL management

export function getMediaType(file) {
  const mime = (file.type || '').toLowerCase()
  const ext = file.name.split('.').pop().toLowerCase()
  
  const photoMimes = [
    'image/jpeg','image/jpg','image/png','image/gif','image/webp',
    'image/heic','image/heif','image/bmp','image/avif','image/tiff',
    'image/svg+xml'
  ]
  const videoMimes = [
    'video/mp4','video/webm','video/quicktime','video/avi',
    'video/x-msvideo','video/x-matroska','video/ogg','video/3gpp',
    'video/mov'
  ]
  const photoExts = [
    'jpg','jpeg','png','gif','webp','heic','heif','bmp','avif','tiff','svg'
  ]
  const videoExts = [
    'mp4','mov','webm','avi','mkv','ogv','3gp'
  ]
    
  if (photoMimes.includes(mime) || photoExts.includes(ext)) return 'photo'
  if (videoMimes.includes(mime) || videoExts.includes(ext)) return 'video'
  
  return 'unknown'
}

export function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', heic: 'image/heic',
    heif: 'image/heif', bmp: 'image/bmp',
    avif: 'image/avif', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm',
    mov: 'video/quicktime', 
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    ogv: 'video/ogg', '3gp': 'video/3gpp',
  }
  return map[ext] || 'application/octet-stream'
}

export async function generateImageThumbnail(file, maxSize = 320) {
  // If SVGs, read file content as base64 directly to preserve perfect vector infinite quality!
  const ext = file.name.split('.').pop().toLowerCase()
  if (file.type === 'image/svg+xml' || ext === 'svg') {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        let w = img.naturalWidth
        let h = img.naturalHeight
        
        if (w === 0 || h === 0) {
          URL.revokeObjectURL(url)
          resolve(null)
          return
        }
        
        const ratio = Math.min(maxSize / w, maxSize / h)
        if (ratio < 1) {
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve(null)
          return
        }
        
        ctx.drawImage(img, 0, 0, w, h)
        // Get base64 WITHOUT the data: prefix
        const dataURL = canvas.toDataURL('image/jpeg', 0.75)
        URL.revokeObjectURL(url)
        // Return only the base64 data part
        resolve(dataURL.split(',')[1])
      } catch {
        URL.revokeObjectURL(url)
        resolve(null)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    
    img.src = url
  })
}

export async function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let resolved = false
    
    const done = (result) => {
      if (!resolved) {
        resolved = true
        URL.revokeObjectURL(url)
        resolve(result)
      }
    }
    
    // Timeout after 15 seconds
    const timeout = setTimeout(() => done(null), 15000)
    
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    
    video.onloadeddata = () => {
      clearTimeout(timeout)
      video.currentTime = Math.min(1, video.duration * 0.1 || 0)
    }
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const maxSize = 320
        let w = video.videoWidth || 320
        let h = video.videoHeight || 240
        const ratio = Math.min(maxSize/w, maxSize/h)
        if (ratio < 1) {
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, w, h)
        const dataURL = canvas.toDataURL('image/jpeg', 0.75)
        done(dataURL.split(',')[1])
      } catch {
        done(null)
      }
    }
    
    video.onerror = () => {
      clearTimeout(timeout)
      done(null)
    }
    
    video.src = url
  })
}

export async function compressImage(file) {
  const skipTypes = [
    'image/gif','image/svg+xml','image/heic','image/heif','image/avif','image/webp'
  ]
  if (skipTypes.includes(file.type)) return file
  if (file.size < 500 * 1024) return file
  
  try {
    const imageCompression = (await import('browser-image-compression')).default
    return await imageCompression(file, {
      maxSizeMB: 5,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.85,
    })
  } catch {
    return file
  }
}

export async function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ 
        width: img.naturalWidth, 
        height: img.naturalHeight 
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 0, height: 0 })
    }
    img.src = url
  })
}

export async function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration || 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const sizes = ['B','KB','MB','GB']
  return `${(bytes / Math.pow(k,i)).toFixed(1)} ${sizes[Math.min(i, 3)]}`
}

export function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }
  return `${m}:${String(s).padStart(2,'0')}`
}

// Track active object URLs
const _activeURLs = new Set()

export function createObjectURL(buffer, mimeType) {
  const blob = new Blob([buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  _activeURLs.add(url)
  return url
}

export function revokeObjectURL(url) {
  if (url && _activeURLs.has(url)) {
    URL.revokeObjectURL(url)
    _activeURLs.delete(url)
  }
}
