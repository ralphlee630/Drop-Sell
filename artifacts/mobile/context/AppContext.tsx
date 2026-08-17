import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  AppNotification,
  DroppingArea,
  Item,
  NewItemForm,
  Partnership,
  SellerProfile,
  Transaction,
} from '@/lib/types';
import { snapshotFeeAtPurchase } from '@/lib/feeCalculations';
import { sendLocalNotification } from '@/lib/pushNotifications';
import { uploadItemPhoto } from '@/lib/supabaseStorage';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface AppContextValue {
  droppingAreas: DroppingArea[];
  sellerProfiles: SellerProfile[];
  partnerships: Partnership[];
  items: Item[];
  transactions: Transaction[];
  notifications: AppNotification[];
  isLoading: boolean;
  dataError: string | null;
  getSellerById: (sellerId: string) => SellerProfile | undefined;
  getAreaById: (areaId: string) => DroppingArea | undefined;
  getItemsByArea: (areaId: string) => Item[];
  getPartnerSellersForArea: (areaId: string) => SellerProfile[];
  getApprovedAreasForSeller: (sellerId: string) => DroppingArea[];
  getSellerForCurrentUser: () => SellerProfile | undefined;
  getMyPartnerships: () => Partnership[];
  getUnreadCount: () => number;
  refreshData: () => Promise<void>;
  purchaseItem: (itemId: string) => Promise<Transaction>;
  createItem: (form: NewItemForm, photoUri?: string) => Promise<Item>;
  markItemDropped: (itemId: string) => Promise<void>;
  requestPartnership: (sellerProfileId: string, areaId: string) => Promise<void>;
  approvePartnership: (partnershipId: string) => Promise<void>;
  rejectPartnership: (partnershipId: string) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  becomeSeller: (businessName: string, bio: string) => Promise<SellerProfile>;
  approveArea: (areaId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

type NotificationInsert = {
  user_id: string;
  type: AppNotification['type'];
  title: string;
  message: string;
  related_item_id?: string;
  is_read: boolean;
};

function mapArea(row: any): DroppingArea {
  return row as DroppingArea;
}

function mapSeller(row: any): SellerProfile {
  return row as SellerProfile;
}

function mapPartnership(row: any): Partnership {
  return row as Partnership;
}

function mapItem(row: any): Item {
  return {
    ...row,
    amount: Number(row.amount),
    base_handling_fee: Number(row.base_handling_fee),
    late_handling_fee: Number(row.late_handling_fee),
  } as Item;
}

function mapTransaction(row: any): Transaction {
  return {
    ...row,
    item_amount: Number(row.item_amount),
    handling_fee_applied: Number(row.handling_fee_applied),
    total_amount: Number(row.total_amount),
  } as Transaction;
}

function mapNotification(row: any): AppNotification {
  return row as AppNotification;
}

async function insertNotifications(payload: NotificationInsert[]): Promise<AppNotification[]> {
  if (payload.length === 0) return [];

  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('*');
  if (error) throw new Error(`Could not create notification: ${error.message}`);
  return (data ?? []).map(mapNotification);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, updateUser } = useAuth();
  const [droppingAreas, setDroppingAreas] = useState<DroppingArea[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);

    let areasResult: any;
    let sellersResult: any;
    let partnershipsResult: any;
    let itemsResult: any;
    let transactionsResult: any;
    let notificationsResult: any;
    try {
      [areasResult, sellersResult, partnershipsResult, itemsResult, transactionsResult, notificationsResult] =
        await Promise.all([
          supabase.from('dropping_areas').select('*').order('name'),
          supabase.from('seller_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('partnerships').select('*').order('requested_at', { ascending: false }),
          supabase.from('items').select('*').order('created_at', { ascending: false }),
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          currentUser
            ? supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Supabase';
      console.error('Supabase data load failed:', message);
      setDataError(message);
      setIsLoading(false);
      return;
    }

    const results = [
      areasResult,
      sellersResult,
      partnershipsResult,
      itemsResult,
      transactionsResult,
      notificationsResult,
    ];
    const failed = results.find((result: any) => result.error);
    if (failed?.error) {
      console.error('Supabase data load failed:', failed.error.message);
      setDataError(failed.error.message);
    }

    setDroppingAreas((areasResult.data ?? []).map(mapArea));
    setSellerProfiles((sellersResult.data ?? []).map(mapSeller));
    setPartnerships((partnershipsResult.data ?? []).map(mapPartnership));
    setItems((itemsResult.data ?? []).map(mapItem));
    setTransactions((transactionsResult.data ?? []).map(mapTransaction));
    setNotifications((notificationsResult.data ?? []).map(mapNotification));
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getSellerById = useCallback(
    (sellerId: string) => sellerProfiles.find((seller) => seller.id === sellerId),
    [sellerProfiles]
  );

  const getAreaById = useCallback(
    (areaId: string) => droppingAreas.find((area) => area.id === areaId),
    [droppingAreas]
  );

  const getItemsByArea = useCallback(
    (areaId: string) => items.filter((item) => item.dropping_area_id === areaId),
    [items]
  );

  const getPartnerSellersForArea = useCallback(
    (areaId: string) => {
      const approvedSellerIds = partnerships
        .filter((partnership) => partnership.dropping_area_id === areaId && partnership.status === 'approved')
        .map((partnership) => partnership.seller_id);
      return sellerProfiles.filter((seller) => approvedSellerIds.includes(seller.id));
    },
    [partnerships, sellerProfiles]
  );

  const getApprovedAreasForSeller = useCallback(
    (sellerId: string) => {
      const approvedAreaIds = partnerships
        .filter((partnership) => partnership.seller_id === sellerId && partnership.status === 'approved')
        .map((partnership) => partnership.dropping_area_id);
      return droppingAreas.filter((area) => approvedAreaIds.includes(area.id));
    },
    [partnerships, droppingAreas]
  );

  const getSellerForCurrentUser = useCallback(
    () => sellerProfiles.find((seller) => seller.user_id === currentUser?.id),
    [sellerProfiles, currentUser]
  );

  const getMyPartnerships = useCallback(() => {
    const seller = sellerProfiles.find((profile) => profile.user_id === currentUser?.id);
    return seller ? partnerships.filter((partnership) => partnership.seller_id === seller.id) : [];
  }, [partnerships, sellerProfiles, currentUser]);

  const getUnreadCount = useCallback(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const notifyCurrentDevice = useCallback(
    async (userId: string, title: string, body: string, data: Record<string, string>) => {
      // Cross-device push delivery belongs in a trusted server/Edge Function.
      // The database notification is created for every recipient; this local
      // alert is only shown when the recipient is the currently signed-in user.
      if (currentUser?.id === userId) {
        await sendLocalNotification({ title, body, data });
      }
    },
    [currentUser]
  );

  const purchaseItem = useCallback(
    async (itemId: string): Promise<Transaction> => {
      if (!currentUser) throw new Error('Must be logged in to purchase');

      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .eq('status', 'dropped')
        .single();
      if (itemError || !itemRow) throw new Error('Item is no longer available for purchase');

      const item = mapItem(itemRow);
      const fee = snapshotFeeAtPurchase(item);
      const { data: transactionRow, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          item_id: itemId,
          buyer_id: currentUser.id,
          item_amount: item.amount,
          handling_fee_applied: fee,
          total_amount: item.amount + fee,
          status: 'completed',
        })
        .select('*')
        .single();
      if (transactionError) throw new Error(`Purchase failed: ${transactionError.message}`);

      const { data: soldRow, error: soldError } = await supabase
        .from('items')
        .update({ status: 'sold' })
        .eq('id', itemId)
        .eq('status', 'dropped')
        .select('*')
        .single();
      if (soldError) throw new Error(`Could not reserve item: ${soldError.message}`);

      const seller = sellerProfiles.find((profile) => profile.id === item.seller_id);
      const notificationPayload: NotificationInsert[] = [
        {
          user_id: currentUser.id,
          type: 'purchase_confirmed',
          title: 'Purchase Confirmed',
          message: `Your purchase of "${item.title}" is confirmed. Pick it up at the hub.`,
          related_item_id: itemId,
          is_read: false,
        },
      ];
      if (seller) {
        notificationPayload.push({
          user_id: seller.user_id,
          type: 'item_sold',
          title: 'Item Sold',
          message: `"${item.title}" (${item.product_code}) was purchased by a buyer.`,
          related_item_id: itemId,
          is_read: false,
        });
      }

      const newNotifications = await insertNotifications(notificationPayload);
      const transaction = mapTransaction(transactionRow);
      const soldItem = mapItem(soldRow);

      setItems((previous) => previous.map((entry) => (entry.id === itemId ? soldItem : entry)));
      setTransactions((previous) => [transaction, ...previous]);
      setNotifications((previous) => [...newNotifications, ...previous]);

      await notifyCurrentDevice(
        currentUser.id,
        'Purchase Confirmed',
        `"${item.title}" is yours! Pick it up at the hub.`,
        { itemId, screen: 'item' }
      );
      if (seller) {
        await notifyCurrentDevice(
          seller.user_id,
          'Item Sold',
          `"${item.title}" was just purchased.`,
          { itemId, screen: 'item' }
        );
      }

      return transaction;
    },
    [currentUser, sellerProfiles, notifyCurrentDevice]
  );

  const createItem = useCallback(
    async (form: NewItemForm, photoUri?: string): Promise<Item> => {
      if (!currentUser) throw new Error('Must be logged in');
      const seller = sellerProfiles.find((profile) => profile.user_id === currentUser.id);
      if (!seller) throw new Error('Seller profile required');

      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadItemPhoto(photoUri, currentUser.id, `${Date.now()}`);
      }

      const { data, error } = await supabase
        .from('items')
        .insert({
          seller_id: seller.id,
          dropping_area_id: form.dropping_area_id,
          title: form.title.trim(),
          description: form.description.trim(),
          product_code: form.product_code.trim(),
          buyer_name: form.buyer_name.trim() || null,
          amount: Number(form.amount),
          base_handling_fee: Number(form.base_handling_fee),
          late_handling_fee: Number(form.late_handling_fee),
          photo_url: photoUrl,
          status: 'pending_dropoff',
          deadline_at: form.deadline_at.toISOString(),
        })
        .select('*')
        .single();
      if (error) throw new Error(`Could not save listing: ${error.message}`);

      const item = mapItem(data);
      setItems((previous) => [item, ...previous]);
      return item;
    },
    [currentUser, sellerProfiles]
  );

  const markItemDropped = useCallback(
    async (itemId: string) => {
      const item = items.find((entry) => entry.id === itemId);
      if (!item) return;

      const { data, error } = await supabase
        .from('items')
        .update({ status: 'dropped', dropped_at: new Date().toISOString() })
        .eq('id', itemId)
        .eq('status', 'pending_dropoff')
        .select('*')
        .single();
      if (error) throw new Error(`Could not mark item dropped: ${error.message}`);

      const seller = sellerProfiles.find((profile) => profile.id === item.seller_id);
      const newNotifications = seller
        ? await insertNotifications([{
            user_id: seller.user_id,
            type: 'item_dropped',
            title: 'Item Arrived at Hub',
            message: `"${item.title}" (${item.product_code}) is ready for buyers.`,
            related_item_id: itemId,
            is_read: false,
          }])
        : [];

      setItems((previous) => previous.map((entry) => (entry.id === itemId ? mapItem(data) : entry)));
      setNotifications((previous) => [...newNotifications, ...previous]);

      if (seller) {
        await notifyCurrentDevice(
          seller.user_id,
          'Item Arrived at Hub',
          `"${item.title}" is ready for buyers.`,
          { itemId, screen: 'item' }
        );
      }
    },
    [items, sellerProfiles, notifyCurrentDevice]
  );

  const requestPartnership = useCallback(
    async (sellerProfileId: string, areaId: string) => {
      const { error } = await supabase.from('partnerships').insert({
        seller_id: sellerProfileId,
        dropping_area_id: areaId,
        status: 'pending',
      });
      if (error && !error.message.toLowerCase().includes('duplicate')) {
        throw new Error(`Could not request partnership: ${error.message}`);
      }
      await refreshData();
    },
    [refreshData]
  );

  const updatePartnership = useCallback(
    async (partnershipId: string, status: 'approved' | 'rejected') => {
      const partnership = partnerships.find((entry) => entry.id === partnershipId);
      if (!partnership) return;

      const { data, error } = await supabase
        .from('partnerships')
        .update({
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', partnershipId)
        .select('*')
        .single();
      if (error) throw new Error(`Could not update partnership: ${error.message}`);

      const seller = sellerProfiles.find((profile) => profile.id === partnership.seller_id);
      const area = droppingAreas.find((entry) => entry.id === partnership.dropping_area_id);
      const newNotifications = seller
        ? await insertNotifications([{
            user_id: seller.user_id,
            type: status === 'approved' ? 'partnership_approved' : 'partnership_rejected',
            title: status === 'approved' ? 'Partnership Approved' : 'Partnership Not Approved',
            message: status === 'approved'
              ? `You can now list items at ${area?.name ?? 'the hub'}.`
              : `Your request with ${area?.name ?? 'the hub'} was declined.`,
            is_read: false,
          }])
        : [];

      setPartnerships((previous) =>
        previous.map((entry) => (entry.id === partnershipId ? mapPartnership(data) : entry))
      );
      setNotifications((previous) => [...newNotifications, ...previous]);

      if (seller) {
        await notifyCurrentDevice(
          seller.user_id,
          status === 'approved' ? 'Partnership Approved' : 'Partnership Not Approved',
          status === 'approved'
            ? `You can now list items at ${area?.name ?? 'the hub'}.`
            : `Your request with ${area?.name ?? 'the hub'} was declined.`,
          { screen: 'partnerships' }
        );
      }
    },
    [partnerships, sellerProfiles, droppingAreas, notifyCurrentDevice]
  );

  const approvePartnership = useCallback(
    async (partnershipId: string) => updatePartnership(partnershipId, 'approved'),
    [updatePartnership]
  );

  const rejectPartnership = useCallback(
    async (partnershipId: string) => updatePartnership(partnershipId, 'rejected'),
    [updatePartnership]
  );

  const markNotificationRead = useCallback(async (notifId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    if (error) throw new Error(`Could not mark notification read: ${error.message}`);
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notifId ? { ...notification, is_read: true } : notification
      )
    );
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    if (error) throw new Error(`Could not mark notifications read: ${error.message}`);
    setNotifications((previous) => previous.map((notification) => ({ ...notification, is_read: true })));
  }, [currentUser]);

  const becomeSeller = useCallback(
    async (businessName: string, bio: string): Promise<SellerProfile> => {
      if (!currentUser) throw new Error('Must be logged in');
      const { data, error } = await supabase
        .from('seller_profiles')
        .insert({
          user_id: currentUser.id,
          business_name: businessName.trim(),
          bio: bio.trim(),
          verified: false,
        })
        .select('*')
        .single();
      if (error) throw new Error(`Could not create seller profile: ${error.message}`);

      const seller = mapSeller(data);
      setSellerProfiles((previous) => [...previous, seller]);
      updateUser({ is_seller: true, role: 'seller' });
      return seller;
    },
    [currentUser, updateUser]
  );

  const approveArea = useCallback(async (areaId: string) => {
    const { data, error } = await supabase
      .from('dropping_areas')
      .update({ status: 'active' })
      .eq('id', areaId)
      .select('*')
      .single();
    if (error) throw new Error(`Could not approve area: ${error.message}`);
    setDroppingAreas((previous) =>
      previous.map((area) => (area.id === areaId ? mapArea(data) : area))
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
        dataError,
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