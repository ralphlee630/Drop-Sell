import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { User } from '@/lib/types';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { supabase, type ProfileRow } from '@/lib/supabase';

// Required once per app so the in-app browser used for Google sign-in
// correctly hands control back to the app after the redirect completes.
WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<{ needsEmailVerification: boolean }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function profileToUser(profile: ProfileRow): User {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? undefined,
    is_seller: profile.is_seller,
    role: profile.role,
    expoPushToken: profile.expo_push_token ?? undefined,
    created_at: profile.created_at,
  };
}

async function loadOrCreateProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (data) return profileToUser(data as ProfileRow);

  const fullName =
    typeof authUser.user_metadata?.full_name === 'string'
      ? authUser.user_metadata.full_name
      : authUser.email?.split('@')[0] ?? 'Drop & Sell user';

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      full_name: fullName,
      email: authUser.email ?? '',
      is_seller: false,
      role: 'buyer',
    })
    .select('*')
    .single();

  if (createError) throw new Error(`Could not create your profile: ${createError.message}`);
  return profileToUser(created as ProfileRow);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const attachPushToken = useCallback(async (user: User): Promise<User> => {
    const cached = await Storage.get<string>(STORAGE_KEYS.PUSH_TOKEN);
    const token = cached ?? (await registerForPushNotificationsAsync());
    if (!token) return user;

    await Storage.set(STORAGE_KEYS.PUSH_TOKEN, token);
    const { error: tokenError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );
    if (tokenError) {
      console.warn('Could not save device push token:', tokenError.message);
    }

    if (token === user.expoPushToken) return user;

    const { data, error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      // Push registration should not prevent authentication.
      console.warn('Could not save push token:', error.message);
      return user;
    }
    return profileToUser(data as ProfileRow);
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!sessionUser) {
        if (active) {
          setCurrentUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await loadOrCreateProfile(sessionUser);
        const withPushToken = await attachPushToken(profile);
        if (active) setCurrentUser(withPushToken);
      } catch (error) {
        console.error(error);
        if (active) setCurrentUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrate(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase recommends deferring database work outside this callback.
      setTimeout(() => void hydrate(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [attachPushToken]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Supabase did not return a user session');

    const profile = await loadOrCreateProfile(data.user);
    setCurrentUser(await attachPushToken(profile));
  }, [attachPushToken]);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Supabase did not create the account');

    // No session means Supabase's "Confirm email" setting is on and this
    // account is awaiting email verification — that's a successful
    // registration, not an error. The caller shows a proper success state
    // for this, rather than an error message.
    if (!data.session) {
      return { needsEmailVerification: true };
    }

    const profile = await loadOrCreateProfile(data.user);
    setCurrentUser(await attachPushToken(profile));
    return { needsEmailVerification: false };
  }, [attachPushToken]);

  const signInWithGoogle = useCallback(async () => {
    // The redirect target the browser hands control back to once Google
    // sign-in completes. Uses the app's own custom scheme (already
    // configured in app.json), so this works the same in Expo Go and in a
    // standalone build.
    const redirectTo = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error('Could not start Google sign-in');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !('url' in result) || !result.url) {
      throw new Error('Google sign-in was cancelled');
    }

    // Supabase returns the session tokens as a URL fragment on the redirect,
    // e.g. myapp://auth/callback#access_token=...&refresh_token=...
    const fragment = result.url.split('#')[1] ?? result.url.split('?')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      const errorDescription = params.get('error_description');
      throw new Error(errorDescription || 'Google sign-in did not return a valid session');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw new Error(sessionError.message);
    if (!sessionData.user) throw new Error('Could not establish a session');

    const profile = await loadOrCreateProfile(sessionData.user);
    setCurrentUser(await attachPushToken(profile));
  }, [attachPushToken]);

  const logout = useCallback(async () => {
    const token = await Storage.get<string>(STORAGE_KEYS.PUSH_TOKEN);
    if (currentUser && token) {
      const { error: tokenError } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('token', token);
      if (tokenError) {
        console.warn('Could not remove this device push token:', tokenError.message);
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setCurrentUser(null);
  }, [currentUser]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setCurrentUser((previous) => {
      if (!previous) return previous;

      const updated = { ...previous, ...updates };
      void supabase
        .from('profiles')
        .update({
          full_name: updated.full_name,
          phone: updated.phone ?? null,
          is_seller: updated.is_seller,
          role: updated.role,
          expo_push_token: updated.expoPushToken ?? null,
        })
        .eq('id', updated.id)
        .then(({ error }) => {
          if (error) console.error('Could not update profile:', error.message);
        });
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isAuthenticated: !!currentUser,
        login,
        register,
        signInWithGoogle,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}