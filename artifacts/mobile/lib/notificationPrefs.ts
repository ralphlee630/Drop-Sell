import { useCallback, useEffect, useState } from 'react';
import { Storage, STORAGE_KEYS } from './storage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from './supabase';

export interface NotificationPrefs {
  itemDropped: boolean;     // Seller: your item arrived at the hub
  itemSold: boolean;        // Seller: your item was purchased
  partnershipUpdates: boolean; // Seller: partnership approved / rejected
  purchaseConfirmations: boolean; // Buyer: your purchase was confirmed
  deadlineReminders: boolean;  // Seller: item approaching deadline
}

export const DEFAULT_PREFS: NotificationPrefs = {
  itemDropped: true,
  itemSold: true,
  partnershipUpdates: true,
  purchaseConfirmations: true,
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
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('item_dropped,item_sold,partnership_updates,purchase_confirmations,deadline_reminders')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const stored = await Storage.get<NotificationPrefs>(key);
      if (!active) return;

      if (data && !error) {
        const remotePrefs: NotificationPrefs = {
          itemDropped: data.item_dropped,
          itemSold: data.item_sold,
          partnershipUpdates: data.partnership_updates,
          purchaseConfirmations: data.purchase_confirmations,
          deadlineReminders: data.deadline_reminders,
        };
        setPrefs(remotePrefs);
        await Storage.set(key, remotePrefs);
      } else {
        setPrefs(stored ?? DEFAULT_PREFS);
      }
      setIsLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  const updatePref = useCallback(
    async (prefKey: keyof NotificationPrefs, value: boolean) => {
      if (!currentUser) return;
      const next = { ...prefs, [prefKey]: value };
      setPrefs(next);
      await Storage.set(`${STORAGE_KEYS.NOTIF_PREFS}:${currentUser.id}`, next);
      const { error } = await supabase.from('notification_preferences').upsert({
        user_id: currentUser.id,
        item_dropped: next.itemDropped,
        item_sold: next.itemSold,
        partnership_updates: next.partnershipUpdates,
        purchase_confirmations: next.purchaseConfirmations,
        deadline_reminders: next.deadlineReminders,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn('Could not sync notification preferences:', error.message);
      }
    },
    [prefs, currentUser]
  );

  return { prefs, isLoading, updatePref };
}
