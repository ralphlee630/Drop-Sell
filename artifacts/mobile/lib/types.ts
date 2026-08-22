export type UserRole = 'buyer' | 'seller' | 'hub_admin' | 'super_admin';
export type ItemStatus = 'pending_dropoff' | 'dropped' | 'sold' | 'expired' | 'cancelled';
export type PartnershipStatus = 'pending' | 'approved' | 'rejected' | 'terminated';
export type DroppingAreaStatus = 'pending_approval' | 'active' | 'suspended';
export type TransactionStatus = 'reserved' | 'paid' | 'completed' | 'cancelled';
export type NotificationType =
  | 'item_dropped'
  | 'item_sold'
  | 'deadline_passed'
  | 'fee_updated'
  | 'purchase_confirmed'
  | 'partnership_approved'
  | 'partnership_rejected';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_seller: boolean;
  role: UserRole;
  expoPushToken?: string;
  created_at: string;
}

export interface DroppingArea {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_info: string;
  admin_user_id: string;
  status: DroppingAreaStatus;
  base_handling_fee: number;
  late_handling_fee: number;
  created_at: string;
}

export interface SellerProfile {
  id: string;
  user_id: string;
  business_name: string;
  bio: string;
  verified: boolean;
  created_at: string;
}

export interface Partnership {
  id: string;
  seller_id: string;
  dropping_area_id: string;
  status: PartnershipStatus;
  requested_at: string;
  approved_at?: string;
}

export interface Item {
  id: string;
  seller_id: string;
  dropping_area_id: string;
  title: string;
  description: string;
  product_code: string;
  buyer_name?: string;
  amount: number;
  base_handling_fee: number;
  late_handling_fee: number;
  photo_url?: string;
  status: ItemStatus;
  dropped_at?: string;
  deadline_at: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  item_id: string;
  buyer_id: string;
  item_amount: number;
  handling_fee_applied: number;
  total_amount: number;
  status: TransactionStatus;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_item_id?: string;
  related_partnership_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NewItemForm {
  title: string;
  description: string;
  product_code: string;
  buyer_name: string;
  amount: string;
  deadline_at: Date;
  dropping_area_id: string;
  photo_uri?: string;
}

export interface NewDroppingAreaForm {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_info: string;
  base_handling_fee: string;
  late_handling_fee: string;
}
