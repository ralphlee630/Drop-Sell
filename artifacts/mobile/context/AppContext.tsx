import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  DroppingArea,
  SellerProfile,
  Partnership,
  Item,
  Transaction,
  AppNotification,
  NewItemForm,
} from '@/lib/types';
import {
  MOCK_DROPPING_AREAS,
  MOCK_SELLER_PROFILES,
  MOCK_PARTNERSHIPS,
  MOCK_ITEMS,
  MOCK_TRANSACTIONS,
  MOCK_NOTIFICATIONS,
  MOCK_USERS,
} from '@/lib/mockData';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { snapshotFeeAtPurchase } from '@/lib/feeCalculations';
import { sendLocalNotification, sendExpoPushNotification } from '@/lib/pushNotifications';
import { useAuth } from './AuthContext';

interface AppContextValue {
  droppingAreas: DroppingArea[];
  sellerProfiles: SellerProfile[];
  partnerships: Partnership[];
  items: Item[];
  transactions: Transaction[];
  notifications: AppNotification[];
  isLoading: boolean;
  // Derived helpers
  getSellerById: (sellerId: string) => SellerProfile | undefined;
  getAreaById: (areaId: string) => DroppingArea | undefined;
  getItemsByArea: (areaId: string) => Item[];
  getPartnerSellersForArea: (areaId: string) => SellerProfile[];
  getApprovedAreasForSeller: (sellerId: string) => DroppingArea[];
  getSellerForCurrentUser: () => SellerProfile | undefined;
  getMyPartnerships: () => Partnership[];
  getUnreadCount: () => number;
  // Actions
  refreshData: () => void;
  purchaseItem: (itemId: string) => Promise<Transaction>;
  createItem: (form: NewItemForm, photoUri?: string) => Promise<Item>;
  markItemDropped: (itemId: string) => void;
  requestPartnership: (sellerProfileId: string, areaId: string) => void;
  approvePartnership: (partnershipId: string) => void;
  rejectPartnership: (partnershipId: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  becomeSeller: (businessName: string, bio: string) => Promise<SellerProfile>;
  approveArea: (areaId: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeNotif(
  userId: string,
  type: AppNotification['type'],
  title: string,
  message: string,
  relatedItemId?: string
): AppNotification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    type,
    title,
    message,
    related_item_id: relatedItemId,
    is_read: false,
    created_at: new Date().toISOString(),
  };
}

/** Look up a mock user's push token by their user id. */
function getPushTokenForUser(userId: string): string | undefined {
  const user = MOCK_USERS.find((u) => u.id === userId);
  return (user as { expoPushToken?: string })?.expoPushToken;
}

/** Fire both a local (same-device) notification and a remote Expo push if a token is available. */
async function fireNotification(opts: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  // Always send a local notification so it surfaces in the current device's tray
  await sendLocalNotification({ title: opts.title, body: opts.body, data: opts.data });
  // Also attempt remote push if we have the recipient's token (ready for multi-device)
  const token = getPushTokenForUser(opts.userId);
  if (token) {
    await sendExpoPushNotification({ to: token, title: opts.title, body: opts.body, data: opts.data });
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, updateUser } = useAuth();

  const [droppingAreas, setDroppingAreas] = useState<DroppingArea[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage (or seed from mock data)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const seeded = await Storage.get<boolean>(STORAGE_KEYS.SEEDED);

    if (!seeded) {
      await Storage.set(STORAGE_KEYS.ITEMS, MOCK_ITEMS);
      await Storage.set(STORAGE_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
      await Storage.set(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
      await Storage.set(STORAGE_KEYS.PARTNERSHIPS, MOCK_PARTNERSHIPS);
      await Storage.set(STORAGE_KEYS.SEEDED, true);
    }

    const storedItems = await Storage.get<Item[]>(STORAGE_KEYS.ITEMS);
    const storedTxns = await Storage.get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
    const storedNotifs = await Storage.get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS);
    const storedPartnerships = await Storage.get<Partnership[]>(STORAGE_KEYS.PARTNERSHIPS);

    setDroppingAreas(MOCK_DROPPING_AREAS);
    setSellerProfiles(MOCK_SELLER_PROFILES);
    setItems(storedItems ?? MOCK_ITEMS);
    setTransactions(storedTxns ?? MOCK_TRANSACTIONS);
    setNotifications(storedNotifs ?? MOCK_NOTIFICATIONS);
    setPartnerships(storedPartnerships ?? MOCK_PARTNERSHIPS);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived helpers ───────────────────────────────────────────────────
  const getSellerById = useCallback(
    (sellerId: string) => sellerProfiles.find((s) => s.id === sellerId),
    [sellerProfiles]
  );

  const getAreaById = useCallback(
    (areaId: string) => droppingAreas.find((a) => a.id === areaId),
    [droppingAreas]
  );

  const getItemsByArea = useCallback(
    (areaId: string) => items.filter((i) => i.dropping_area_id === areaId),
    [items]
  );

  const getPartnerSellersForArea = useCallback(
    (areaId: string) => {
      const approvedSellerIds = partnerships
        .filter((p) => p.dropping_area_id === areaId && p.status === 'approved')
        .map((p) => p.seller_id);
      return sellerProfiles.filter((s) => approvedSellerIds.includes(s.id));
    },
    [partnerships, sellerProfiles]
  );

  const getApprovedAreasForSeller = useCallback(
    (sellerId: string) => {
      const approvedAreaIds = partnerships
        .filter((p) => p.seller_id === sellerId && p.status === 'approved')
        .map((p) => p.dropping_area_id);
      return droppingAreas.filter((a) => approvedAreaIds.includes(a.id));
    },
    [partnerships, droppingAreas]
  );

  const getSellerForCurrentUser = useCallback(
    () => sellerProfiles.find((s) => s.user_id === currentUser?.id),
    [sellerProfiles, currentUser]
  );

  const getMyPartnerships = useCallback(() => {
    const myProfile = sellerProfiles.find((s) => s.user_id === currentUser?.id);
    if (!myProfile) return [];
    return partnerships.filter((p) => p.seller_id === myProfile.id);
  }, [partnerships, sellerProfiles, currentUser]);

  const getUnreadCount = useCallback(
    () => notifications.filter((n) => n.user_id === currentUser?.id && !n.is_read).length,
    [notifications, currentUser]
  );

  // ─── Actions ──────────────────────────────────────────────────────────
  const refreshData = useCallback(() => loadData(), [loadData]);

  const purchaseItem = useCallback(
    async (itemId: string): Promise<Transaction> => {
      if (!currentUser) throw new Error('Must be logged in to purchase');

      const item = items.find((i) => i.id === itemId);
      if (!item) throw new Error('Item not found');
      if (item.status !== 'dropped') throw new Error('Item is not available for purchase');

      const fee = snapshotFeeAtPurchase(item);
      const txn: Transaction = {
        id: `txn-${Date.now()}`,
        item_id: itemId,
        buyer_id: currentUser.id,
        item_amount: item.amount,
        handling_fee_applied: fee,
        total_amount: item.amount + fee,
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      const updatedItems = items.map((i) =>
        i.id === itemId ? { ...i, status: 'sold' as const } : i
      );
      const updatedTxns = [...transactions, txn];

      // In-app notification for buyer (purchase confirmed)
      const buyerNotif = makeNotif(
        currentUser.id,
        'purchase_confirmed',
        'Purchase Confirmed ✓',
        `Your purchase of "${item.title}" is confirmed. Head to the hub to pick it up.`,
        itemId
      );

      // In-app notification for seller (item sold)
      const sellerProfile = sellerProfiles.find((s) => s.id === item.seller_id);
      const sellerUserId = sellerProfile?.user_id;
      const newNotifs: AppNotification[] = [buyerNotif];

      if (sellerUserId) {
        newNotifs.push(
          makeNotif(
            sellerUserId,
            'item_sold',
            'Item Sold 🎉',
            `"${item.title}" (${item.product_code}) was purchased by a buyer.`,
            itemId
          )
        );
      }

      const updatedNotifs = [...notifications, ...newNotifs];

      setItems(updatedItems);
      setTransactions(updatedTxns);
      setNotifications(updatedNotifs);

      await Storage.set(STORAGE_KEYS.ITEMS, updatedItems);
      await Storage.set(STORAGE_KEYS.TRANSACTIONS, updatedTxns);
      await Storage.set(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

      // Push: buyer gets local confirmation; seller gets local + remote
      await fireNotification({
        userId: currentUser.id,
        title: 'Purchase Confirmed ✓',
        body: `"${item.title}" is yours! Pick up at the hub.`,
        data: { itemId, screen: 'item' },
      });

      if (sellerUserId) {
        await fireNotification({
          userId: sellerUserId,
          title: 'Item Sold 🎉',
          body: `"${item.title}" was just purchased.`,
          data: { itemId, screen: 'item' },
        });
      }

      return txn;
    },
    [items, transactions, notifications, sellerProfiles, currentUser]
  );

  const createItem = useCallback(
    async (form: NewItemForm, photoUri?: string): Promise<Item> => {
      if (!currentUser) throw new Error('Must be logged in');
      const myProfile = sellerProfiles.find((s) => s.user_id === currentUser.id);
      if (!myProfile) throw new Error('Seller profile required');

      const newItem: Item = {
        id: `item-${Date.now()}`,
        seller_id: myProfile.id,
        dropping_area_id: form.dropping_area_id,
        title: form.title,
        description: form.description,
        product_code: form.product_code,
        buyer_name: form.buyer_name || undefined,
        amount: parseFloat(form.amount),
        base_handling_fee: parseFloat(form.base_handling_fee),
        late_handling_fee: parseFloat(form.late_handling_fee),
        photo_url: photoUri,
        status: 'pending_dropoff',
        deadline_at: form.deadline_at.toISOString(),
        created_at: new Date().toISOString(),
      };

      const updated = [...items, newItem];
      setItems(updated);
      await Storage.set(STORAGE_KEYS.ITEMS, updated);
      return newItem;
    },
    [items, sellerProfiles, currentUser]
  );

  const markItemDropped = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const updated = items.map((i) =>
        i.id === itemId
          ? { ...i, status: 'dropped' as const, dropped_at: new Date().toISOString() }
          : i
      );
      setItems(updated);
      Storage.set(STORAGE_KEYS.ITEMS, updated);

      // Find the seller's user id (not the seller profile id)
      const sellerProfile = sellerProfiles.find((s) => s.id === item.seller_id);
      const sellerUserId = sellerProfile?.user_id;

      if (sellerUserId) {
        const notif = makeNotif(
          sellerUserId,
          'item_dropped',
          'Item Arrived at Hub 📦',
          `"${item.title}" (${item.product_code}) has been received and is ready for pickup.`,
          itemId
        );
        const updatedNotifs = [...notifications, notif];
        setNotifications(updatedNotifs);
        Storage.set(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

        // Push to seller
        fireNotification({
          userId: sellerUserId,
          title: 'Item Arrived at Hub 📦',
          body: `"${item.title}" is ready for buyers to purchase.`,
          data: { itemId, screen: 'item' },
        });
      }
    },
    [items, notifications, sellerProfiles]
  );

  const requestPartnership = useCallback(
    (sellerProfileId: string, areaId: string) => {
      const existing = partnerships.find(
        (p) => p.seller_id === sellerProfileId && p.dropping_area_id === areaId
      );
      if (existing) return;

      const newP: Partnership = {
        id: `p-${Date.now()}`,
        seller_id: sellerProfileId,
        dropping_area_id: areaId,
        status: 'pending',
        requested_at: new Date().toISOString(),
      };

      const updated = [...partnerships, newP];
      setPartnerships(updated);
      Storage.set(STORAGE_KEYS.PARTNERSHIPS, updated);
    },
    [partnerships]
  );

  const approvePartnership = useCallback(
    (partnershipId: string) => {
      const partnership = partnerships.find((p) => p.id === partnershipId);
      const updated = partnerships.map((p) =>
        p.id === partnershipId
          ? { ...p, status: 'approved' as const, approved_at: new Date().toISOString() }
          : p
      );
      setPartnerships(updated);
      Storage.set(STORAGE_KEYS.PARTNERSHIPS, updated);

      if (partnership) {
        const sellerProfile = sellerProfiles.find((s) => s.id === partnership.seller_id);
        const sellerUserId = sellerProfile?.user_id;
        const area = droppingAreas.find((a) => a.id === partnership.dropping_area_id);

        if (sellerUserId) {
          const notif = makeNotif(
            sellerUserId,
            'partnership_approved',
            'Partnership Approved ✓',
            `Your partnership with "${area?.name ?? 'the hub'}" has been approved. You can now list items there.`
          );
          const updatedNotifs = [...notifications, notif];
          setNotifications(updatedNotifs);
          Storage.set(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

          fireNotification({
            userId: sellerUserId,
            title: 'Partnership Approved ✓',
            body: `You can now list items at ${area?.name ?? 'the hub'}.`,
            data: { screen: 'partnerships' },
          });
        }
      }
    },
    [partnerships, sellerProfiles, droppingAreas, notifications]
  );

  const rejectPartnership = useCallback(
    (partnershipId: string) => {
      const partnership = partnerships.find((p) => p.id === partnershipId);
      const updated = partnerships.map((p) =>
        p.id === partnershipId ? { ...p, status: 'rejected' as const } : p
      );
      setPartnerships(updated);
      Storage.set(STORAGE_KEYS.PARTNERSHIPS, updated);

      if (partnership) {
        const sellerProfile = sellerProfiles.find((s) => s.id === partnership.seller_id);
        const sellerUserId = sellerProfile?.user_id;
        const area = droppingAreas.find((a) => a.id === partnership.dropping_area_id);

        if (sellerUserId) {
          const notif = makeNotif(
            sellerUserId,
            'partnership_rejected',
            'Partnership Not Approved',
            `Your request to partner with "${area?.name ?? 'the hub'}" was not approved.`
          );
          const updatedNotifs = [...notifications, notif];
          setNotifications(updatedNotifs);
          Storage.set(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

          fireNotification({
            userId: sellerUserId,
            title: 'Partnership Not Approved',
            body: `Your request with ${area?.name ?? 'the hub'} was declined.`,
            data: { screen: 'partnerships' },
          });
        }
      }
    },
    [partnerships, sellerProfiles, droppingAreas, notifications]
  );

  const markNotificationRead = useCallback(
    (notifId: string) => {
      const updated = notifications.map((n) => (n.id === notifId ? { ...n, is_read: true } : n));
      setNotifications(updated);
      Storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    },
    [notifications]
  );

  const markAllNotificationsRead = useCallback(() => {
    const updated = notifications.map((n) =>
      n.user_id === currentUser?.id ? { ...n, is_read: true } : n
    );
    setNotifications(updated);
    Storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
  }, [notifications, currentUser]);

  const becomeSeller = useCallback(
    async (businessName: string, bio: string): Promise<SellerProfile> => {
      if (!currentUser) throw new Error('Must be logged in');

      const newProfile: SellerProfile = {
        id: `seller-${Date.now()}`,
        user_id: currentUser.id,
        business_name: businessName,
        bio,
        verified: false,
        created_at: new Date().toISOString(),
      };

      setSellerProfiles((prev) => [...prev, newProfile]);
      updateUser({ is_seller: true, role: 'seller' });
      return newProfile;
    },
    [currentUser, updateUser]
  );

  const approveArea = useCallback((areaId: string) => {
    setDroppingAreas((prev) =>
      prev.map((a) => (a.id === areaId ? { ...a, status: 'active' as const } : a))
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        droppingAreas,
        sellerProfiles,
        partnerships,
        items,
        transactions,
        notifications,
        isLoading,
        getSellerById,
        getAreaById,
        getItemsByArea,
        getPartnerSellersForArea,
        getApprovedAreasForSeller,
        getSellerForCurrentUser,
        getMyPartnerships,
        getUnreadCount,
        refreshData,
        purchaseItem,
        createItem,
        markItemDropped,
        requestPartnership,
        approvePartnership,
        rejectPartnership,
        markNotificationRead,
        markAllNotificationsRead,
        becomeSeller,
        approveArea,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
