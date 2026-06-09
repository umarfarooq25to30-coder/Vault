// Standalone password generator tool with persistent generation history and account usage lookup
// Opens as a modal/panel and maps usage back to credentials seamlessly

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  RefreshCw, Copy, Check, Settings2,
  Zap, X, History, Trash2, Clock
} from 'lucide-react'
import { 
  generatePassword, generatePassphrase,
  checkPasswordStrength, copyToClipboard,
  PASSWORD_CATEGORIES
} from '../../utils/passwordUtils'
import StrengthBar from './StrengthBar'
import PasswordAvatar from './PasswordAvatar'

export default function PasswordGenerator({ 
  onUse,  // callback when user clicks "Use this"
  onClose,
  passwords = [], // Array of live decrypted items for reverse-engineering usage
  defaultShowHistory = false,
  historyOnly = false,
  onCloseHistory
}) {
  const [mode, setMode] = useState('password')
  // 'password' | 'passphrase'
  
  const [options, setOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  })
  
  const [phraseOptions, setPhraseOptions] = useState({
    wordCount: 4,
    separator: '-',
    capitalize: true,
    includeNumber: true,
  })
  
  const [generated, setGenerated] = useState(() =>
    generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
    })
  )
  
  const [copied, setCopied] = useState(false)

  // History modal controls
  const [showHistoryModal, setShowHistoryModal] = useState(defaultShowHistory)
  const [historyList, setHistoryList] = useState([])
  const [copiedId, setCopiedId] = useState(null)

  // Fetch history list from local store
  const loadHistory = useCallback(() => {
    const stored = localStorage.getItem('vault_generated_passwords')
    try {
      setHistoryList(stored ? JSON.parse(stored) : [])
    } catch {
      setHistoryList([])
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Automatically record newly generated passwords to history (debounced with de-duplication)
  useEffect(() => {
    if (historyOnly || !generated) return
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('vault_generated_passwords')
      let list = []
      try {
        list = stored ? JSON.parse(stored) : []
      } catch {
        list = []
      }
      // Consecutively de-duplicate
      if (list.length > 0 && list[0].password === generated) return
      
      const newEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        password: generated,
        timestamp: Date.now(),
        mode: mode,
      }
      
      const updatedList = [newEntry, ...list].slice(0, 50)
      localStorage.setItem('vault_generated_passwords', JSON.stringify(updatedList))
      setHistoryList(updatedList)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [generated, mode, historyOnly])

  const regenerate = useCallback(() => {
    if (mode === 'password') {
      setGenerated(generatePassword(options))
    } else {
      setGenerated(generatePassphrase(phraseOptions))
    }
    setCopied(false)
  }, [mode, options, phraseOptions])

  const handleCopy = async () => {
    await copyToClipboard(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyHistory = async (pwd, id) => {
    await copyToClipboard(pwd)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClearHistory = () => {
    localStorage.removeItem('vault_generated_passwords')
    setHistoryList([])
  }

  // Regenerate when options change
  const updateOption = (key, value) => {
    const newOpts = { ...options, [key]: value }
    setOptions(newOpts)
    if (mode === 'password') {
      setGenerated(generatePassword(newOpts))
    }
    setCopied(false)
  }

  const updatePhraseOption = (key, value) => {
    const newOpts = { ...phraseOptions, [key]: value }
    setPhraseOptions(newOpts)
    setGenerated(generatePassphrase(newOpts))
    setCopied(false)
  }

  const formatTime = (timestamp) => {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Determine if a given password is currently actively in use in the vault
  const getPasswordUsage = (pwd) => {
    if (!passwords || passwords.length === 0) return null
    const matched = passwords.find(item => item.data?.password === pwd)
    if (!matched) return null
    return {
      siteName: matched.data?.siteName || matched.title || 'Untitled',
      username: matched.data?.username || 'No email or username',
      url: matched.data?.url || '',
      category: matched.data?.category || 'other'
    }
  }

  const getCatColor = (catId) => {
    const matched = PASSWORD_CATEGORIES.find(c => c.id === catId)
    return matched ? matched.color : '#888888'
  }

  const strength = checkPasswordStrength(generated)

  // Standalone History Modal Rendering
  if (historyOnly) {
    return createPortal(
      <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[9999] animate-fade-in select-none">
        <div className="bg-[#1C1C1C] w-full max-w-md rounded-2xl flex flex-col p-5 animate-slide-up max-h-[80vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 flex-shrink-0 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-[#888888]" />
              <h3 className="text-sm font-semibold text-[#F0F0F0]">
                Password Generation History
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear list
                </button>
              )}
              <button
                type="button"
                onClick={onCloseHistory}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#252525] text-[#888888] hover:text-[#C0C0C0] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body / Scrollable History List */}
          <div className="flex-1 overflow-y-auto app-scroll mt-4 space-y-2.5 pr-0.5">
            {historyList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                <div className="w-12 h-12 rounded-full bg-[#141414] flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-[#555555]" />
                </div>
                <p className="text-[13px] font-medium text-[#888888]">No history yet</p>
                <p className="text-[11px] text-[#555555] max-w-[200px] mt-1">
                  Generated passwords will show up here.
                </p>
              </div>
            ) : (
              historyList.map((item) => {
                const usage = getPasswordUsage(item.password)
                return (
                  <div 
                    key={item.id} 
                    className="bg-[#141414] p-3 rounded-xl flex flex-col transition-all duration-150 text-left"
                  >
                    {/* Top Meta info & Actions */}
                    <div className="flex items-center justify-between mb-1.5 select-none">
                      <span className="text-[10px] text-[#555555] font-mono tracking-wider">
                        {formatTime(item.timestamp)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyHistory(item.password, item.id)}
                          className="text-[10px] text-[#888888] hover:text-[#F0F0F0] hover:bg-[#202020] px-2 py-0.5 rounded cursor-pointer transition-colors font-medium flex items-center gap-1"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Display of password */}
                    <div className="font-mono text-[12px] text-[#C0C0C0] select-all break-all bg-[#1E1E1E] px-2.5 py-2 rounded-lg leading-relaxed select-text">
                      {item.password}
                    </div>

                    {/* Usage Details Section */}
                    <div className="flex items-center justify-between mt-2 pt-1.5">
                      <span className="text-[10px] text-[#555555] font-sans uppercase tracking-wider font-semibold">
                        Account Use
                      </span>
                      {usage ? (
                        <div className="flex items-center gap-2 bg-[#1C1C1C] px-2 py-0.5 rounded-lg">
                          <PasswordAvatar
                            url={usage.url}
                            siteName={usage.siteName}
                            catColor={getCatColor(usage.category)}
                            size="w-4.5 h-4.5"
                            textSize="text-[8px]"
                          />
                          <div className="flex flex-col text-left leading-none max-w-[130px]">
                            <span className="text-[10px] font-medium text-[#D0D0D0] truncate max-w-[125px]">
                              {usage.siteName}
                            </span>
                            {usage.username && (
                              <span className="text-[8px] text-[#666666] truncate max-w-[125px] mt-0.5">
                                {usage.username}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#666666] bg-[#1E1E1E] px-1.5 py-0.5 rounded font-mono select-none">
                          no use
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          <div className="mt-4 flex-shrink-0">
            <button
              type="button"
              onClick={onCloseHistory}
              className="w-full py-2 bg-[#252525] text-[#C0C0C0] hover:bg-[#2A2A2A] hover:text-[#F0F0F0] text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Close History
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div className="bg-[#1E1E1E] rounded-2xl p-5 w-full max-w-md">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#888888]" />
          <h3 className="text-[15px] font-semibold text-[#F0F0F0]">
            Password Generator
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              loadHistory()
              setShowHistoryModal(true)
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#252525] text-[#888888] hover:text-[#C0C0C0] transition-colors cursor-pointer"
            title="View password generation history"
          >
            <History className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#252525] text-[#555555] hover:text-[#C0C0C0] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#141414] mb-4">
        {['password', 'passphrase'].map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              if (m === 'password') {
                setGenerated(
                  generatePassword(options)
                )
              } else {
                setGenerated(
                  generatePassphrase(phraseOptions)
                )
              }
              setCopied(false)
            }}
            className={`flex-1 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all duration-150 ${
              mode === m
                ? 'bg-[#2A2A2A] text-[#F0F0F0]'
                : 'text-[#666666] hover:text-[#888888]'
            }`}
          >
            {m === 'password' 
              ? 'Password' 
              : 'Passphrase'}
          </button>
        ))}
      </div>

      {/* Generated password display */}
      <div className="bg-[#141414] rounded-xl p-3 mb-3">
        <p className="font-mono text-[15px] text-[#F0F0F0] break-all leading-relaxed min-h-[48px] flex items-center select-text">
          {generated}
        </p>
      </div>

      {/* Strength bar */}
      <div className="mb-4">
        <StrengthBar 
          password={generated} 
          showLabel={true}
          showChecks={false}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={regenerate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer bg-[#252525] text-[#C0C0C0] hover:bg-[#2A2A2A] hover:text-[#F0F0F0] transition-all flex-1"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
        
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all flex-1 ${
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-[#252525] text-[#C0C0C0] hover:bg-[#2A2A2A] hover:text-[#F0F0F0]'
          }`}
        >
          {copied
            ? <Check className="w-4 h-4" />
            : <Copy className="w-4 h-4" />
          }
          {copied ? 'Copied!' : 'Copy'}
        </button>
        
        {onUse && (
          <button
            type="button"
            onClick={() => onUse(generated)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all flex-1 bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD]"
          >
            Use this
          </button>
        )}
      </div>

      {/* Options */}
      {mode === 'password' ? (
        <div className="space-y-3">
          {/* Length slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-[#888888]">
                Length
              </span>
              <span className="text-[13px] font-medium text-[#F0F0F0]">
                {options.length}
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              step="1"
              value={options.length}
              onChange={e => updateOption(
                'length', 
                parseInt(e.target.value)
              )}
              className="w-full cursor-pointer accent-[#F0F0F0]"
            />
          </div>

          {/* Toggles */}
          {[
            { key: 'uppercase', 
              label: 'Uppercase (A-Z)' },
            { key: 'lowercase', 
              label: 'Lowercase (a-z)' },
            { key: 'numbers', 
              label: 'Numbers (0-9)' },
            { key: 'symbols', 
              label: 'Symbols (!@#$)' },
            { key: 'excludeAmbiguous', 
              label: 'Exclude ambiguous (0,O,l,1)' },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between"
            >
              <span className="text-[13px] text-[#C0C0C0]">
                {label}
              </span>
              <button
                type="button"
                onClick={() => updateOption(
                  key, !options[key]
                )}
                className={`w-10 h-5.5 rounded-full transition-colors duration-200 cursor-pointer relative ${
                  options[key]
                    ? 'bg-[#F0F0F0]'
                    : 'bg-[#333333]'
                }`}
                style={{ 
                  width: '40px', 
                  height: '22px' 
                }}
              >
                <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-transform duration-200 ${
                  options[key]
                    ? 'translate-x-[19px] bg-[#141414]'
                    : 'translate-x-0.5 bg-[#888888]'
                }`}
                />
              </button>
            </div>
          ))}
        </div>
      ) : (
        // Passphrase options
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-[#888888]">
                Word count
              </span>
              <span className="text-[13px] font-medium text-[#F0F0F0]">
                {phraseOptions.wordCount}
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="8"
              step="1"
              value={phraseOptions.wordCount}
              onChange={e => updatePhraseOption(
                'wordCount', 
                parseInt(e.target.value)
              )}
              className="w-full cursor-pointer accent-[#F0F0F0]"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#C0C0C0]">
              Separator
            </span>
            <div className="flex gap-1">
              {['-', '.', '_', ' '].map(sep => (
                <button
                  key={sep}
                  type="button"
                  onClick={() => updatePhraseOption(
                    'separator', sep
                  )}
                  className={`w-8 h-8 rounded-lg text-[13px] font-mono cursor-pointer transition-colors ${
                    phraseOptions.separator === sep
                      ? 'bg-[#F0F0F0] text-[#141414]'
                      : 'bg-[#252525] text-[#888888] hover:text-[#C0C0C0]'
                  }`}
                >
                  {sep === ' ' ? '·' : sep}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'capitalize', label: 'Capitalize words' },
            { key: 'includeNumber', label: 'Include number' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[13px] text-[#C0C0C0]">
                {label}
              </span>
              <button
                type="button"
                onClick={() => updatePhraseOption(
                  key, !phraseOptions[key]
                )}
                className={`transition-colors duration-200 cursor-pointer relative rounded-full`}
                style={{ width: '40px', height: '22px',
                  backgroundColor: phraseOptions[key]
                    ? '#F0F0F0' : '#333333'
                }}
              >
                <div
                  className="absolute top-0.5 w-[18px] h-[18px] rounded-full transition-transform duration-200"
                  style={{
                    transform: phraseOptions[key]
                      ? 'translateX(19px)'
                      : 'translateX(2px)',
                    backgroundColor: phraseOptions[key]
                      ? '#141414' : '#888888'
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* History Popup Modal */}
      {showHistoryModal && createPortal(
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[9999] animate-fade-in select-none">
          <div className="bg-[#1C1C1C] w-full max-w-md rounded-2xl flex flex-col p-5 animate-slide-up max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-[#888888]" />
                <h3 className="text-sm font-semibold text-[#F0F0F0]">
                  Password Generation History
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear list
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#252525] text-[#888888] hover:text-[#C0C0C0] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable History List */}
            <div className="flex-1 overflow-y-auto app-scroll mt-2 space-y-2.5 pr-0.5">
              {historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                  <div className="w-12 h-12 rounded-full bg-[#141414] flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-[#555555]" />
                  </div>
                  <p className="text-[13px] font-medium text-[#888888]">No history yet</p>
                  <p className="text-[11px] text-[#555555] max-w-[200px] mt-1">
                    Generated passwords and passphrases will appear here.
                  </p>
                </div>
              ) : (
                historyList.map((item) => {
                  const usage = getPasswordUsage(item.password)
                  return (
                    <div 
                      key={item.id} 
                      className="bg-[#141414] p-3 rounded-xl flex flex-col transition-all duration-150 text-left"
                    >
                      {/* Top Meta info & Actions */}
                      <div className="flex items-center justify-between mb-1.5 select-none">
                        <span className="text-[10px] text-[#555555] font-mono tracking-wider">
                          {formatTime(item.timestamp)}
                        </span>
                        <div className="flex gap-1.55">
                          <button
                            type="button"
                            onClick={() => handleCopyHistory(item.password, item.id)}
                            className="text-[10px] text-[#888888] hover:text-[#F0F0F0] hover:bg-[#202020] px-2 py-0.5 rounded cursor-pointer transition-colors font-medium flex items-center gap-1"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Display of password */}
                      <div className="font-mono text-[12px] text-[#C0C0C0] select-all break-all bg-[#1E1E1E] px-2.5 py-2 rounded-lg leading-relaxed select-text">
                        {item.password}
                      </div>

                      {/* Usage Details Section */}
                      <div className="flex items-center justify-between mt-2 pt-1.5">
                        <span className="text-[10px] text-[#555555] font-sans uppercase tracking-wider font-semibold">
                          Account Use
                        </span>
                        {usage ? (
                          <div className="flex items-center gap-2 bg-[#1C1C1C] px-2 py-0.5 rounded-lg">
                            <PasswordAvatar
                              url={usage.url}
                              siteName={usage.siteName}
                              catColor={getCatColor(usage.category)}
                              size="w-4.5 h-4.5"
                              textSize="text-[8px]"
                            />
                            <div className="flex flex-col text-left leading-none max-w-[130px]">
                              <span className="text-[10px] font-medium text-[#D0D0D0] truncate max-w-[125px]">
                                {usage.siteName}
                              </span>
                              {usage.username && (
                                <span className="text-[8px] text-[#666666] truncate max-w-[125px] mt-0.5">
                                  {usage.username}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#666666] bg-[#1E1E1E] px-1.5 py-0.5 rounded font-mono select-none">
                            no use
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            
            <div className="mt-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2 bg-[#252525] text-[#C0C0C0] hover:bg-[#2A2A2A] hover:text-[#F0F0F0] text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
