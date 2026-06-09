// Custom React hook providing on-device storage capacity metrics and type distribution stats.

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { formatBytes, formatRelativeDate } from '../utils/formatters';
import { getStorageStats } from '../db/vaultOperations';

import { useUiStore } from '../store/uiStore';

export function useStorage() {
  const [lastBackupData] = useState({
    lastBackup: null,
    lastBackupFormatted: 'Never'
  });

  const storageLimit = useUiStore(s => s.storageLimit);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const rawStats = useLiveQuery(
    () => getStorageStats(),
    [refreshTrigger],
    {
      totalItems: 0,
      itemsByType: { note: 0, file: 0, photo: 0, password: 0, card: 0, diary: 0, voice: 0 },
      estimatedSize: 0,
      lastBackup: null
    }
  );

  let realUsage = rawStats?.estimatedSize || 0;
  let realQuota = storageLimit * 1073741824;

  if (navigator.storage && navigator.storage.estimate) {
    // we cannot easily make a synchronous value from navigator.storage.estimate,
    // so we approximate or just stick to rawStats.estimatedSize which is exact DB size
  }

  const rawPct = realQuota > 0 ? (realUsage / realQuota) * 100 : 0.01;
  const percentage = Math.min(100, Math.max(0.01, rawPct));

  const stats = {
    ...rawStats,
    estimatedSize: realUsage,
    formattedSize: formatBytes(realUsage),
    quota: realQuota,
    formattedQuota: formatBytes(realQuota),
    percentage: Number(percentage.toFixed(2)),
    lastBackup: lastBackupData.lastBackup,
    lastBackupFormatted: formatRelativeDate(lastBackupData.lastBackup),
  };

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    stats,
    isLoading: !rawStats,
    refresh
  };
}

