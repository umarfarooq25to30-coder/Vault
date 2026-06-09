// Right panel — shows full details of selected password
// All sensitive fields are hidden by default

import { useState, useCallback } from 'react'
import { 
  Eye, EyeOff, Copy, Check, Edit2,
  Trash2, Star, Globe, ExternalLink,
  Lock, User, FileText, Tag, Calendar,
  Shield
} from 'lucide-react'
import { 
  copyToClipboard, getCategoryColor,
  PASSWORD_CATEGORIES, checkPasswordStrength
} from '../../utils/passwordUtils'
import StrengthBar from './StrengthBar'
import PasswordAvatar from './PasswordAvatar'

export default function PasswordDetail({
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
  customCategories = [],
}) {
  const [showPassword, setShowPassword] = 
    useState(false)
  const [copiedField, setCopiedField] = 
    useState(null)
  // 'username' | 'password' | 'url'
  
  const [confirmDelete, setConfirmDelete] = 
    useState(false)

  const handleCopy = useCallback(
    async (text, field) => {
      if (!text) return
      await copyToClipboard(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    },
    []
  )

  const data = item?.data || {}
  const strength = checkPasswordStrength(
    data.password || ''
  )
  const combined = [...PASSWORD_CATEGORIES, ...customCategories]
  const listCategory = combined.find(c => c.id === data.category)
  const categoryColor = listCategory?.color || '#888888'
  const categoryLabel = listCategory?.label || 'Other'

  // Letter avatar for site
  const siteInitial = (data.siteName || item?.title || '?')
    .charAt(0)
    .toUpperCase()

  return (
    <div className="h-full flex flex-col">
      
      {/* Header */}
      <div className="px-6 py-5 flex items-start
        gap-4">
        {/* Site avatar */}
        <PasswordAvatar
          url={data.url}
          siteName={data.siteName || item?.title}
          catColor={categoryColor}
          size="w-14 h-14"
          textSize="text-[22px]"
        />
        
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-semibold
            text-zinc-800 dark:text-[#F0F0F0] truncate">
            {data.siteName || item?.title || 
              'Untitled'}
          </h2>
          <p className="text-[13px] text-zinc-500 dark:text-[#888888]
            truncate mt-0.5">
            {data.username || 'No username'}
          </p>
          {/* Category badge */}
          <span
            className="inline-block mt-2 px-2.5 
              py-0.5 rounded-lg text-[11px] 
              font-medium"
            style={{
              backgroundColor: categoryColor + '22',
              color: categoryColor,
            }}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 
          flex-shrink-0">
          <button
            type="button"
            onClick={() => onToggleFavorite(item.id)}
            className="w-9 h-9 flex items-center
              justify-center rounded-xl cursor-pointer
              transition-all duration-150
              hover:bg-zinc-200 dark:hover:bg-[#252525]"
          >
            <Star className={`w-4 h-4 ${
              item?.isFavorite
                ? 'text-amber-400 fill-amber-400'
                : 'text-zinc-400 dark:text-[#555555]'
            }`} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="w-9 h-9 flex items-center
              justify-center rounded-xl cursor-pointer
              text-zinc-400 dark:text-[#555555] hover:text-zinc-800 dark:hover:text-[#C0C0C0]
              hover:bg-zinc-200 dark:hover:bg-[#252525] transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="px-2 py-1 rounded-lg
                  text-[12px] cursor-pointer
                  text-red-500 dark:text-red-400 hover:bg-red-500/10
                  transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded-lg
                  text-[12px] cursor-pointer
                  text-zinc-400 dark:text-[#666666] hover:text-zinc-800 dark:hover:text-[#C0C0C0]
                  transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-9 h-9 flex items-center
                justify-center rounded-xl cursor-pointer
                text-zinc-400 dark:text-[#555555] hover:text-red-500 dark:hover:text-red-400
                hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Spacing spacer instead of border divider */}
      <div className="mx-6 my-1" />

      {/* Fields */}
      <div className="flex-1 overflow-y-auto 
        px-6 py-4 space-y-2">
        
        {/* Username */}
        <FieldRow
          icon={<User className="w-4 h-4" />}
          label="Username"
          value={data.username}
          onCopy={() => handleCopy(
            data.username, 'username'
          )}
          copied={copiedField === 'username'}
          placeholder="No username"
        />

        {/* Password */}
        <div className="rounded-xl bg-zinc-100 dark:bg-[#1A1A1A] p-4">
          <div className="flex items-center
            justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 
                text-zinc-500 dark:text-[#555555]" />
              <span className="text-[12px] 
                font-medium uppercase tracking-wider
                text-zinc-500 dark:text-[#555555]">
                Password
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => 
                  setShowPassword(p => !p)}
                className="w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-zinc-500 dark:text-[#555555]
                  hover:text-zinc-850 dark:hover:text-[#C0C0C0]
                  hover:bg-zinc-200 dark:hover:bg-[#252525] transition-all"
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
              <button
                type="button"
                onClick={() => handleCopy(
                  data.password, 'password'
                )}
                className={`w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer transition-all
                  ${copiedField === 'password'
                    ? 'text-green-600 dark:text-green-400 bg-green-500/10'
                    : 'text-zinc-500 dark:text-[#555555] hover:text-zinc-850 dark:hover:text-[#C0C0C0] hover:bg-zinc-200 dark:hover:bg-[#252525]'
                  }`}
              >
                {copiedField === 'password'
                  ? <Check className="w-4 h-4" />
                  : <Copy className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          {/* Password value */}
          <p className="font-mono text-[15px]
            text-zinc-800 dark:text-[#F0F0F0] break-all">
            {showPassword
              ? (data.password || '—')
              : '•'.repeat(
                  Math.min(
                    data.password?.length || 8, 
                    24
                  )
                )
            }
          </p>

          {/* Strength bar */}
          {data.password && (
            <div className="mt-3">
              <StrengthBar
                password={data.password}
                showLabel={true}
                showChecks={false}
              />
            </div>
          )}
        </div>

        {/* URL */}
        {data.url && (
          <FieldRow
            icon={<Globe className="w-4 h-4" />}
            label="Website"
            value={data.url}
            onCopy={() => handleCopy(
              data.url, 'url'
            )}
            copied={copiedField === 'url'}
            action={
              <button
                type="button"
                onClick={() => {
                  const url = data.url.startsWith(
                    'http'
                  ) ? data.url : `https://${data.url}`
                  window.open(url, '_blank')
                }}
                className="w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-[#555555]
                  hover:text-[#C0C0C0]
                  hover:bg-[#252525] transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            }
          />
        )}

        {/* Notes */}
        {data.notes && (
          <div className="rounded-xl bg-zinc-100 dark:bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2
              mb-2">
              <FileText className="w-4 h-4 
                text-zinc-500 dark:text-[#555555]" />
              <span className="text-[12px] 
                font-medium uppercase tracking-wider
                text-zinc-500 dark:text-[#555555]">
                Notes
              </span>
            </div>
            <p className="text-[14px] text-zinc-700 dark:text-[#C0C0C0]
              leading-relaxed whitespace-pre-wrap">
              {data.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {item?.tags?.length > 0 && (
          <div className="rounded-xl bg-zinc-100 dark:bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2
              mb-2">
              <Tag className="w-4 h-4 
                text-zinc-500 dark:text-[#555555]" />
              <span className="text-[12px] 
                font-medium uppercase tracking-wider
                text-zinc-500 dark:text-[#555555]">
                Tags
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-lg
                    text-[12px] bg-zinc-200 dark:bg-[#252525]
                    text-zinc-600 dark:text-[#888888]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-xl bg-zinc-100 dark:bg-[#1A1A1A] p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-zinc-500 dark:text-[#555555]" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-zinc-500 dark:text-[#555555]">
              Details
            </span>
          </div>
          <MetaRow
            label="Encrypted with"
            value="AES-256-GCM"
          />
          <MetaRow
            label="Created"
            value={item?.createdAt
              ? new Date(item.createdAt)
                .toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'
            }
          />
          <MetaRow
            label="Modified"
            value={item?.updatedAt
              ? new Date(item.updatedAt)
                .toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'
            }
          />
        </div>
      </div>
    </div>
  )
}

// Helper components
function FieldRow({ 
  icon, label, value, 
  onCopy, copied, placeholder, action 
}) {
  return (
    <div className="rounded-xl bg-zinc-100 dark:bg-[#1A1A1A] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-zinc-500 dark:text-[#555555] flex-shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-[#555555] mb-0.5">
              {label}
            </p>
            <p className="text-[14px] text-zinc-800 dark:text-[#F0F0F0] truncate">
              {value || (
                <span className="text-zinc-400 dark:text-[#444444] italic">
                  {placeholder || 'Not set'}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {action}
          {value && (
            <button
              type="button"
              onClick={onCopy}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all
                ${copied
                  ? 'text-green-600 dark:text-green-400 bg-green-500/10'
                  : 'text-zinc-500 dark:text-[#555555] hover:text-zinc-800 dark:hover:text-[#C0C0C0] hover:bg-zinc-200 dark:hover:bg-[#252525]'
                }`}
            >
              {copied
                ? <Check className="w-4 h-4" />
                : <Copy className="w-4 h-4" />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center
      justify-between">
      <span className="text-[12px] text-[#555555]">
        {label}
      </span>
      <span className="text-[12px] text-[#888888]">
        {value}
      </span>
    </div>
  )
}
