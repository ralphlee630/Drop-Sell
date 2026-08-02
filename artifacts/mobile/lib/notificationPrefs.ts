import { useCallback, useEffect, useState } from 'react';
import { Storage, STORAGE_KEYS } from './storage';
import { useAuth } from '@/context/AuthContext';

export interface NotificationPrefs {
  itemDropped: boolean;     // Seller: your item arrived at the hub
  itemSold: boolean;        // Seller: your item was purchased
  partnershipUpdates: boolean; // Seller: partnership approved / rejected
  deadlineReminders: boolean;  // Seller: item approaching deadline
}

export const DEFAULT_PREFS: NotificationPrefs = {
  itemDropped: true,
  itemSold: true,
  partnershipUpdates: true,
  deadlineReminders: true,
};

export function useNotificationPrefs() {
  const { currentUser } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setPrefs(DEFAULT_PREFS);
      setIsLoading(false);
      return;
    }
    const key = `${STORAGE_KEYS.NOTIF_PREFS}:${currentUser.id}`;
    Storage.get<NotificationPrefs>(key).then((stored) => {
      setPrefs(stored ?? DEFAULT_PREFS);
      setIsLoading(false);
    });
  }, [currentUser?.id]);

  const updatePref = useCallback(
    async (prefKey: keyof NotificationPrefs, value: boolean) => {
      if (!currentUser) return;
      const next = { ...prefs, [prefKey]: value };
      setPrefs(next);
      await Storage.set(`${STORAGE_KEYS.NOTIF_PREFS}:${currentUser.id}`, next);
    },
    [prefs, currentUser]
  );

  return { prefs, isLoading, updatePref };
}
