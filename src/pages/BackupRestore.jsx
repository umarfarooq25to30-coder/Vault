import React, { useEffect, useRef, useState } from 'react'
import {
  Download, Upload, Shield, Clock,
  RefreshCw, AlertTriangle, CheckCircle2,
  Eye, EyeOff, FileArchive, Trash2,
  Info, ChevronRight,
} from 'lucide-react'
import { useBackup } from '../hooks/useBackup'
import ProgressModal from '../components/backup/ProgressModal'

export default function BackupRestore() {
  const backup = useBackup()
  const fileInputRef = useRef(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    backup.loadHistory()
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) backup.selectBackupFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) backup.selectBackupFile(file)
  }

  const formatDate = (isoStr) => {
    if (!isoStr) return ''
    return new Date(isoStr).toLocaleDateString(
      'en-US', {
        year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit',
        minute: '2-digit',
      }
    )
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#141414' }}>
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-[24px] font-semibold text-[#F0F0F0]">
            Backup & Restore
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#555555' }}>
            Your data never leaves your device unless you export it
          </p>
        </div>

        {/* INFO BANNER */}
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: '#1A2744' }}>
          <Shield className="w-5 h-5 mt-0.5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-blue-300 mb-1">
              How backup works
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#6699CC' }}>
              Your backup file is encrypted with your master password before leaving the app. Even if someone finds your .vault file, they cannot read it without your password. Store backups on a USB drive, external hard drive, or another secure location.
            </p>
          </div>
        </div>

        {/* ── EXPORT SECTION ── */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1E1E1E' }}>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
              <Download className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#F0F0F0]">
                Create Backup
              </p>
              <p className="text-[12px]" style={{ color: '#555555' }}>
                Export all vault data as encrypted .vault file
              </p>
            </div>
          </div>

          {/* What gets backed up */}
          <div className="space-y-2 mb-5">
            {[
              'All notes and their content',
              'Gallery photos and videos',
              'Passwords and payment cards',
              'Diary entries',
              'Voice recordings',
              'Files and documents',
              'Folders, tags and settings',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className="text-[13px]" style={{ color: '#888888' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={backup.exportBackup}
            disabled={backup.isExporting}
            className="w-full py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: backup.isExporting ? '#252525' : '#22C55E',
              color: backup.isExporting ? '#555555' : '#FFFFFF',
            }}
          >
            {backup.isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating backup...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Create Backup Now
              </>
            )}
          </button>

          {/* Export progress */}
          {backup.isExporting && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full" style={{ backgroundColor: '#252525'}}>
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${backup.exportProgress}%`,
                    backgroundColor: '#22C55E',
                  }}
                />
              </div>
              <p className="text-[11px] mt-1" style={{ color: '#444444' }}>
                {backup.exportProgress}% complete
              </p>
            </div>
          )}
        </div>

        {/* ── RESTORE SECTION ── */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1E1E1E' }}>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#F0F0F0]">
                Restore from Backup
              </p>
              <p className="text-[12px]" style={{ color: '#555555' }}>
                Import a .vault backup file
              </p>
            </div>
          </div>

          {/* STEP: SELECT FILE */}
          {backup.importStep === 'select' && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
              style={{
                backgroundColor: '#141414',
                backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23333' stroke-width='2' stroke-dasharray='8%2c 6' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
              }}
            >
              <FileArchive className="w-10 h-10" style={{ color: '#3A3A3A' }} />
              <p className="text-[14px] font-medium text-[#F0F0F0]">
                Drop .vault file here
              </p>
              <p className="text-[12px]" style={{ color: '#555555' }}>
                or click to browse
              </p>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {backup.importStep === 'preview' && backup.importInfo && (
            <div className="space-y-4">
              {/* Backup info card */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#141414' }}>
                <div className="flex items-center gap-3 mb-3">
                  <FileArchive className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[14px] font-medium text-[#F0F0F0] truncate">
                      {backup.importFile?.name}
                    </p>
                    <p className="text-[12px]" style={{ color: '#555555' }}>
                      {backup.formatBackupSize(backup.importInfo.size)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Created', value: formatDate(backup.importInfo.createdAt) },
                    { label: 'Items', value: `${backup.importInfo.itemCount} encrypted items` },
                    { label: 'Version', value: `Vault v${backup.importInfo.version}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[12px]" style={{ color: '#555555' }}>{label}</span>
                      <span className="text-[12px] text-[#C0C0C0]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restore mode */}
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: '#444444' }}>
                  Restore mode
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'full',
                      label: 'Full Restore',
                      desc: 'Replace everything with backup data. Current vault wiped.',
                      warning: true,
                    },
                    {
                      id: 'merge',
                      label: 'Merge',
                      desc: 'Add items from backup without deleting current data. Same password only.',
                      warning: false,
                    },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => backup.setRestoreMode(mode.id)}
                      className="text-left p-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        backgroundColor: backup.restoreMode === mode.id
                          ? mode.warning ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'
                          : '#141414',
                        outline: backup.restoreMode === mode.id
                          ? `1.5px solid ${mode.warning ? '#EF4444' : '#3B82F6'}`
                          : 'none',
                      }}
                    >
                      <p className="text-[13px] font-medium mb-1"
                        style={{
                          color: backup.restoreMode === mode.id
                            ? mode.warning ? '#EF4444' : '#3B82F6'
                            : '#C0C0C0',
                        }}>
                        {mode.label}
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#555555' }}>
                        {mode.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning for full restore */}
              {backup.restoreMode === 'full' && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-400 leading-relaxed">
                    Full restore will permanently delete your current vault data and replace it with the backup. After restore, unlock with the backup password.
                  </p>
                </div>
              )}

              {/* Password input */}
              <div>
                <label className="block text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: '#555555' }}>
                  Backup password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={backup.importPassword}
                    onChange={e => backup.setImportPassword(e.target.value)}
                    placeholder="Password used when backup was created"
                    className="w-full text-[#F0F0F0] text-[14px] rounded-xl px-4 py-3 pr-12 outline-none placeholder:text-[#333333]"
                    style={{ backgroundColor: '#141414' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && backup.importPassword) {
                        backup.restoreBackup()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                    style={{ color: '#555555' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {backup.importError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-[12px] text-red-400">
                    {backup.importError}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={backup.resetImport}
                  className="px-4 py-3 rounded-xl text-[13px] cursor-pointer transition-colors"
                  style={{ backgroundColor: '#252525', color: '#888888' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={backup.restoreBackup}
                  disabled={!backup.importPassword}
                  className="flex-1 py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: backup.importPassword ? backup.restoreMode === 'full' ? '#EF4444' : '#3B82F6' : '#252525',
                    color: backup.importPassword ? '#FFFFFF' : '#444444',
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {backup.restoreMode === 'full' ? 'Restore & Replace' : 'Merge Restore'}
                </button>
              </div>
            </div>
          )}

          {/* STEP: RESTORING */}
          {backup.importStep === 'restoring' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#888888' }} />
              <p className="text-[15px] text-[#F0F0F0]">
                Restoring vault...
              </p>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#252525' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${backup.importProgress}%`,
                    backgroundColor: '#3B82F6',
                  }}
                />
              </div>
              <p className="text-[12px]" style={{ color: '#555555' }}>
                {backup.importProgress < 40
                  ? 'Verifying password...'
                  : backup.importProgress < 70
                    ? 'Decrypting backup...'
                    : backup.importProgress < 90
                      ? 'Importing data...'
                      : 'Finalizing...'
                }
              </p>
            </div>
          )}

          {/* STEP: DONE */}
          {backup.importStep === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-[16px] font-semibold text-[#F0F0F0]">
                Restore complete!
              </p>
              <p className="text-[13px] text-center" style={{ color: '#888888' }}>
                {backup.restoreMode === 'full'
                  ? 'Your vault has been restored. Please lock and unlock with the backup password.'
                  : 'Items from backup have been merged into your vault.'
                }
              </p>
              <button
                type="button"
                onClick={backup.resetImport}
                className="px-6 py-2.5 rounded-xl text-[14px] font-medium cursor-pointer"
                style={{ backgroundColor: '#F0F0F0', color: '#141414' }}
              >
                Done
              </button>
            </div>
          )}

          {/* STEP: ERROR */}
          {backup.importStep === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-[15px] font-medium text-[#F0F0F0]">
                Restore failed
              </p>
              <p className="text-[13px] text-center text-red-400">
                {backup.importError}
              </p>
              <button
                type="button"
                onClick={backup.resetImport}
                className="px-6 py-2.5 rounded-xl text-[13px] cursor-pointer"
                style={{ backgroundColor: '#252525', color: '#888888' }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".vault,.json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* ── BACKUP HISTORY ── */}
        {backup.backupHistory.length > 0 && (
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#1E1E1E' }}>
            <p className="text-[13px] font-medium uppercase tracking-wider mb-3" style={{ color: '#444444' }}>
              Backup history
            </p>
            <div className="space-y-2">
              {backup.backupHistory.map((record, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    {record.type === 'restore' ? (
                      <Upload className="w-4 h-4 text-blue-400 flex-shrink-0"/>
                    ) : (
                      <Download className="w-4 h-4 text-green-400 flex-shrink-0"/>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#C0C0C0] truncate">
                        {record.type === 'restore' ? 'Restored from backup' : record.filename || 'Backup created'}
                      </p>
                      <p className="text-[11px]" style={{ color: '#555555' }}>
                        {formatDate(record.createdAt)}
                        {record.itemCount ? ` · ${record.itemCount} items` : ''}
                        {record.size ? ` · ${backup.formatBackupSize(record.size)}` : ''}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ── TIPS ── */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1A1A1A' }}>
          <p className="text-[13px] font-medium text-[#C0C0C0] mb-3">
            Backup tips
          </p>
          <div className="space-y-2">
            {[
              'Back up weekly or after adding important data',
              'Store .vault file on USB drive or external hard drive',
              'Keep multiple copies in different locations',
              'Test restore on a different device to verify backup works',
              'The .vault file is useless without your master password',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#444444' }} />
                <p className="text-[12px] leading-relaxed" style={{ color: '#666666' }}>
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
