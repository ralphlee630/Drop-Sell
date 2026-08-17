import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Accept both the project root and the REST endpoint URL copied from Supabase.
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_seller: boolean;
  role: 'buyer' | 'seller' | 'hub_admin' | 'super_admin';
  expo_push_token: string | null;
  created_at: string;
};