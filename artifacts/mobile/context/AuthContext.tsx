import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { DEMO_PASSWORDS, MOCK_USERS } from '@/lib/mockData';
import { Storage, STORAGE_KEYS } from '@/lib/storage';

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

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const expectedPassword = DEMO_PASSWORDS[normalizedEmail];

    if (!expectedPassword || expectedPassword !== password) {
      throw new Error('Invalid email or password. Try buyer@demo.com / password');
    }

    const user = MOCK_USERS.find((u) => u.email === normalizedEmail);
    if (!user) throw new Error('User not found');

    setCurrentUser(user);
    await Storage.set(STORAGE_KEYS.SESSION, user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (DEMO_PASSWORDS[normalizedEmail]) {
      throw new Error('An account with this email already exists');
    }

    // In the real app this would call Supabase auth.signUp()
    const newUser: User = {
      id: `user-${Date.now()}`,
      full_name: fullName,
      email: normalizedEmail,
      is_seller: false,
      role: 'buyer',
      created_at: new Date().toISOString(),
    };

    setCurrentUser(newUser);
    await Storage.set(STORAGE_KEYS.SESSION, newUser);
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await Storage.remove(STORAGE_KEYS.SESSION);
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
