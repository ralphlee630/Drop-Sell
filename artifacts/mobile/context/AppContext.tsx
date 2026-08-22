import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  AppNotification,
  DroppingArea,
  Item,
  NewItemForm,
  NewDroppingAreaForm,
  Partnership,
  SellerProfile,
  Transaction,
} from '@/lib/types';
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
  registerDroppingArea: (form: NewDroppingAreaForm) => Promise<DroppingArea>;
  reviewArea: (
    areaId: string,
    status: 'active' | 'rejected' | 'suspended',
    baseFee?: number,
    lateFee?: number
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

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

      // purchase_item is a SECURITY DEFINER Postgres function: it row-locks the
      // item, recomputes the handling fee server-side from the real deadline
      // (never trusting a client-supplied total), and inserts the transaction
      // + both notifications atomically. See supabase/security-patch-01.sql.
      const { data, error } = await supabase.rpc('purchase_item', { p_item_id: itemId });
      if (error) throw new Error(`Purchase failed: ${error.message}`);

      const transaction = mapTransaction(data);
      await refreshData();

      const item = items.find((entry) => entry.id === itemId);
      const seller = item ? sellerProfiles.find((profile) => profile.id === item.seller_id) : undefined;

      await notifyCurrentDevice(
        currentUser.id,
        'Purchase Confirmed',
        item ? `"${item.title}" is yours! Pick it up at the hub.` : 'Your purchase is confirmed.',
        { itemId, screen: 'item' }
      );
      if (seller && item) {
        await notifyCurrentDevice(
          seller.user_id,
          'Item Sold',
          `"${item.title}" was just purchased.`,
          { itemId, screen: 'item' }
        );
      }

      return transaction;
    },
    [currentUser, items, sellerProfiles, notifyCurrentDevice, refreshData]
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

      // create_item is a SECURITY DEFINER Postgres function: it checks the
      // caller has an APPROVED partnership with this dropping area, and
      // reads the handling fees directly from the dropping area itself —
      // the fee is never accepted from the client, so a seller (or a
      // modified client) can never set their own fee.
      // See supabase/security-patch-02.sql.
      const { data, error } = await supabase.rpc('create_item', {
        p_dropping_area_id: form.dropping_area_id,
        p_title: form.title.trim(),
        p_description: form.description.trim(),
        p_product_code: form.product_code.trim(),
        p_buyer_name: form.buyer_name.trim() || null,
        p_amount: Number(form.amount),
        p_photo_url: photoUrl,
        p_deadline_at: form.deadline_at.toISOString(),
      });
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

      // mark_item_dropped is a SECURITY DEFINER Postgres function: it verifies
      // the caller is actually this hub's admin (or a super admin) before
      // allowing the transition, and writes the seller notification itself.
      // See supabase/security-patch-01.sql.
      const { data, error } = await supabase.rpc('mark_item_dropped', { p_item_id: itemId });
      if (error) throw new Error(`Could not mark item dropped: ${error.message}`);

      setItems((previous) => previous.map((entry) => (entry.id === itemId ? mapItem(data) : entry)));
      await refreshData();

      const seller = sellerProfiles.find((profile) => profile.id === item.seller_id);
      if (seller) {
        await notifyCurrentDevice(
          seller.user_id,
          'Item Arrived at Hub',
          `"${item.title}" is ready for buyers.`,
          { itemId, screen: 'item' }
        );
      }
    },
    [items, sellerProfiles, notifyCurrentDevice, refreshData]
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

      // respond_to_partnership is a SECURITY DEFINER Postgres function: it
      // verifies the caller is actually this hub's admin (or a super admin)
      // before allowing the decision, and writes the matching seller
      // notification itself so the two can never drift apart.
      // See supabase/security-patch-01.sql.
      const { data, error } = await supabase.rpc('respond_to_partnership', {
        p_partnership_id: partnershipId,
        p_status: status,
      });
      if (error) throw new Error(`Could not update partnership: ${error.message}`);

      setPartnerships((previous) =>
        previous.map((entry) => (entry.id === partnershipId ? mapPartnership(data) : entry))
      );
      await refreshData();

      const seller = sellerProfiles.find((profile) => profile.id === partnership.seller_id);
      const area = droppingAreas.find((entry) => entry.id === partnership.dropping_area_id);
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
    [partnerships, sellerProfiles, droppingAreas, notifyCurrentDevice, refreshData]
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

  const registerDroppingArea = useCallback(
    async (form: NewDroppingAreaForm): Promise<DroppingArea> => {
      // register_dropping_area is a SECURITY DEFINER Postgres function: it
      // always creates the hub as 'pending_approval' — the client can never
      // set a hub live directly, no matter what status is sent. See
      // supabase/security-patch-02.sql.
      const { data, error } = await supabase.rpc('register_dropping_area', {
        p_name: form.name.trim(),
        p_address: form.address.trim(),
        p_latitude: form.latitude,
        p_longitude: form.longitude,
        p_contact_info: form.contact_info.trim(),
        p_base_handling_fee: Number(form.base_handling_fee),
        p_late_handling_fee: Number(form.late_handling_fee),
      });
      if (error) throw new Error(`Could not register dropping area: ${error.message}`);

      const area = mapArea(data);
      setDroppingAreas((previous) => [area, ...previous]);
      return area;
    },
    []
  );

  const reviewArea = useCallback(
    async (
      areaId: string,
      status: 'active' | 'rejected' | 'suspended',
      baseFee?: number,
      lateFee?: number
    ) => {
      // review_dropping_area is a SECURITY DEFINER Postgres function: it
      // verifies the caller is actually a super admin before allowing any
      // status change — a raw client update can no longer approve a hub
      // even for its own owner, enforced by a database trigger.
      // See supabase/security-patch-02.sql.
      const { data, error } = await supabase.rpc('review_dropping_area', {
        p_area_id: areaId,
        p_status: status,
        p_base_handling_fee: baseFee ?? null,
        p_late_handling_fee: lateFee ?? null,
      });
      if (error) throw new Error(`Could not review area: ${error.message}`);
      setDroppingAreas((previous) =>
        previous.map((area) => (area.id === areaId ? mapArea(data) : area))
      );
    },
    []
  );

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
        registerDroppingArea,
        reviewArea,
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