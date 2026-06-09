// Cryptographically accurate formatter functions for bytes capacity, relative calendar timelines, and visual asset mappings.

import { 
  FileText, 
  File, 
  Image, 
  Key, 
  CreditCard, 
  BookOpen, 
  Mic, 
  User 
} from 'lucide-react';
import { VaultFolderIcon } from '../components/shared/VaultFolderIcon';

/**
 * Formats bytes into a human-readable storage string (e.g. B, KB, MB, GB).
 * Matches:
 * - 0 -> "0 B"
 * - 1023 -> "1023 B"
 * - 1024 -> "1.0 KB"
 * - 1536 -> "1.5 KB"
 * - 1048576 -> "1.0 MB"
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) {
    return `${bytes} B`;
  }
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Strips hours to calculate precise calendar day differences for relative timelines.
 * Matches:
 * - null/undefined -> "Never"
 * - today -> "Today"
 * - yesterday -> "Yesterday"
 * - within 6 days -> "X days ago"
 * - this year -> "Jan 15"
 * - older -> "Jan 15, 2024"
 * @param {string|number|Date} isoString 
 * @returns {string}
 */
export function formatRelativeDate(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Never';

  const now = new Date();
  
  // Strip times to establish clean calendar differences
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffMs = todayMidnight.getTime() - targetMidnight.getTime();
  const calendarDiffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (calendarDiffDays === 0) {
    return 'Today';
  } else if (calendarDiffDays === 1) {
    return 'Yesterday';
  } else if (calendarDiffDays > 1 && calendarDiffDays < 7) {
    return `${calendarDiffDays} days ago`;
  } else {
    const isThisYear = date.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
}

/**
 * Formats a Date/ISO string to a full readable layout (e.g. "January 15, 2025 at 3:42 PM").
 * @param {string|number|Date} isoString 
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return 'Never';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Never';

  const dateStr = d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Truncates excessive text length trailing with dots.
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Resolves the appropriate Lucide shape for visual mapping.
 * @param {string} type 
 * @returns {React.ComponentType}
 */
export function getItemIcon(type) {
  switch (type) {
    case 'note': return FileText;
    case 'file': return File;
    case 'photo': return Image;
    case 'password': return Key;
    case 'card': return CreditCard;
    case 'diary': return BookOpen;
    case 'voice': return Mic;
    case 'contact': return User;
    default: return VaultFolderIcon;
  }
}
