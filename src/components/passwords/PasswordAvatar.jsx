// Password avatar component with smart favicon crawler and color fallback

import { useState, useEffect } from 'react'
import { getFaviconUrl } from '../../utils/passwordUtils'

export default function PasswordAvatar({ url, siteName, catColor, size = "w-10 h-10", textSize = "text-[16px]" }) {
  const [imgFailed, setImgFailed] = useState(false)
  
  // Reset failure flag if url/siteName changes
  useEffect(() => {
    setImgFailed(false)
  }, [url, siteName])

  const favicon = getFaviconUrl(url, siteName)

  const initial = (siteName || '?')
    .charAt(0)
    .toUpperCase()

  if (favicon && !imgFailed) {
    return (
      <div 
        className={`${size} rounded-xl bg-transparent flex items-center justify-center flex-shrink-0 overflow-hidden select-none`}
      >
        <img
          src={favicon}
          alt={siteName || 'Favicon'}
          className="w-5.5 h-5.5 object-contain"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </div>
    )
  }

  // Fallback to beautiful colorful letter initial
  return (
    <div
      className={`${size} rounded-xl flex items-center justify-center flex-shrink-0 ${textSize} font-bold select-none`}
      style={{
        backgroundColor: catColor + '22',
        color: catColor,
      }}
    >
      {initial}
    </div>
  )
}
