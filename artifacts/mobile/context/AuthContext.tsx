import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { DEMO_PASSWORDS, MOCK_USERS } from '@/lib/mockData';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    Storage.get<User>(STORAGE_KEYS.SESSION).then((user) => {
      if (user) setCurrentUser(user);
      setIsLoading(false);
    });
  }, []);

  /** Register (or reuse cached) Expo push token and attach it to the user object. */
  const attachPushToken = useCallback(async (user: User): Promise<User> => {
    // Check for a cached token first to avoid repeated permission prompts
    const cached = await Storage.get<string>(STORAGE_KEYS.PUSH_TOKEN);
    if (cached) {
      const withToken = { ...user, expoPushToken: cached };
      await Storage.set(STORAGE_KEYS.SESSION, withToken);
      return withToken;
    }

    const token = await registerForPushNotificationsAsync();
    if (token) {
      await Storage.set(STORAGE_KEYS.PUSH_TOKEN, token);
      const withToken = { ...user, expoPushToken: token };
      await Storage.set(STORAGE_KEYS.SESSION, withToken);
      return withToken;
    }
    return user;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const expectedPassword = DEMO_PASSWORDS[normalizedEmail];

    if (!expectedPassword || expectedPassword !== password) {
      throw new Error('Invalid email or password. Try buyer@demo.com / password');
    }

    const user = MOCK_USERS.find((u) => u.email === normalizedEmail);
    if (!user) throw new Error('User not found');

    const userWithToken = await attachPushToken(user);
    setCurrentUser(userWithToken);
    await Storage.set(STORAGE_KEYS.SESSION, userWithToken);
  }, [attachPushToken]);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (DEMO_PASSWORDS[normalizedEmail]) {
      throw new Error('An account with this email already exists');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      full_name: fullName,
      email: normalizedEmail,
      is_seller: false,
      role: 'buyer',
      created_at: new Date().toISOString(),
    };

    const userWithToken = await attachPushToken(newUser);
    setCurrentUser(userWithToken);
    await Storage.set(STORAGE_KEYS.SESSION, userWithToken);
  }, [attachPushToken]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await Storage.remove(STORAGE_KEYS.SESSION);
    // Keep the push token cached so it can be reused on next login
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      Storage.set(STORAGE_KEYS.SESSION, updated);
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
