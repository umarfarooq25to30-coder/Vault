// File utility functions

// Get file extension from filename
export function getExtension(filename) {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1
    ? parts.pop().toLowerCase()
    : ''
}

// Get MIME type from filename
export function getMimeFromFilename(filename) {
  const ext = getExtension(filename)
  const map = {
    // Documents
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    htm: 'text/html',
    rtf: 'application/rtf',
    // Code
    js: 'text/javascript',
    ts: 'text/typescript',
    py: 'text/x-python',
    css: 'text/css',
    sh: 'text/x-sh',
    yml: 'text/yaml',
    yaml: 'text/yaml',
    sql: 'text/x-sql',
    // MS Office
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-' +
      'officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-' +
      'officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-' +
      'officedocument.presentationml.presentation',
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Video
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
  }
  return map[ext] || 'application/octet-stream'
}

// File type category
export function getFileCategory(filename) {
  const ext = getExtension(filename)
  const categories = {
    document: ['pdf','doc','docx','txt','md',
      'rtf','odt','pages'],
    spreadsheet: ['xls','xlsx','csv','ods',
      'numbers'],
    presentation: ['ppt','pptx','odp','key'],
    image: ['jpg','jpeg','png','gif','webp',
      'svg','bmp','tiff','avif','heic'],
    video: ['mp4','mov','avi','mkv','webm',
      'ogv','3gp'],
    audio: ['mp3','wav','ogg','m4a','flac',
      'aac'],
    archive: ['zip','rar','7z','tar','gz',
      'bz2'],
    code: ['js','ts','jsx','tsx','py','html',
      'css','json','xml','yml','yaml','sql',
      'sh','php','rb','go','rs','java','c',
      'cpp','h','swift','kt'],
    design: ['psd','ai','xd','fig','sketch',
      'indd'],
  }
  for (const [cat, exts] of 
       Object.entries(categories)) {
    if (exts.includes(ext)) return cat
  }
  return 'other'
}

// Can this file be previewed in browser?
export function isPreviewable(filename) {
  const ext = getExtension(filename)
  const previewable = [
    'pdf', 'txt', 'md', 'csv', 'json',
    'xml', 'html', 'js', 'ts', 'jsx', 'tsx',
    'py', 'css', 'sh', 'yml', 'yaml', 'sql',
    'php', 'rb', 'go', 'rs', 'java', 'c',
    'cpp', 'h', 'swift', 'kt', 'code',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  ]
  return previewable.includes(ext)
}

// Is this a text/code file?
export function isTextFile(filename) {
  const ext = getExtension(filename)
  const textTypes = [
    'txt', 'md', 'csv', 'json', 'xml',
    'html', 'htm', 'js', 'ts', 'jsx', 'tsx',
    'py', 'css', 'sh', 'yml', 'yaml', 'sql',
    'php', 'rb', 'go', 'rs', 'java', 'c',
    'cpp', 'h', 'swift', 'kt', 'rtf',
  ]
  return textTypes.includes(ext)
}

// Is this an image file?
export function isImageFile(filename) {
  const ext = getExtension(filename)
  return ['jpg','jpeg','png','gif','webp',
    'svg','bmp','avif'].includes(ext)
}

// Is this a PDF?
export function isPDFFile(filename) {
  return getExtension(filename) === 'pdf'
}

// Get icon name for file type
export function getFileIcon(filename) {
  const cat = getFileCategory(filename)
  const icons = {
    document:     'FileText',
    spreadsheet:  'Sheet',
    presentation: 'Presentation',
    image:        'Image',
    video:        'Video',
    audio:        'Music',
    archive:      'Archive',
    code:         'Code',
    design:       'Layers',
    other:        'File',
  }
  return icons[cat] || 'File'
}

// Get color for file category
export function getFileCategoryColor(filename) {
  const cat = getFileCategory(filename)
  const colors = {
    document:     '#3B82F6',
    spreadsheet:  '#22C55E',
    presentation: '#F97316',
    image:        '#EC4899',
    video:        '#8B5CF6',
    audio:        '#EAB308',
    archive:      '#888888',
    code:         '#14B8A6',
    design:       '#F72585',
    other:        '#666666',
  }
  return colors[cat] || '#666666'
}

// Format file size
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B','KB','MB','GB']
  const i = Math.floor(
    Math.log(bytes) / Math.log(k)
  )
  return `${parseFloat(
    (bytes / Math.pow(k, i)).toFixed(1)
  )} ${sizes[Math.min(i, 3)]}`
}

// Format relative date
export function formatRelDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diff = (now - d) / 1000

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(
    diff / 60
  )} min ago`
  if (diff < 86400) return `${Math.floor(
    diff / 3600
  )} hr ago`
  if (diff < 604800) return `${Math.floor(
    diff / 86400
  )} days ago`

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear()
      ? 'numeric'
      : undefined,
  })
}

// Language for syntax highlighting
export function getLanguage(filename) {
  const ext = getExtension(filename)
  const map = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby',
    go: 'go', rs: 'rust',
    java: 'java', c: 'c', cpp: 'cpp',
    h: 'c', swift: 'swift', kt: 'kotlin',
    css: 'css', html: 'html', htm: 'html',
    xml: 'xml', json: 'json',
    yml: 'yaml', yaml: 'yaml',
    sql: 'sql', sh: 'bash',
    php: 'php', md: 'markdown',
  }
  return map[ext] || 'plaintext'
}
