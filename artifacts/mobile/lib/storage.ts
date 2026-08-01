import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@dropsell:';

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // silent failure — graceful degradation
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      // silent failure
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter((k) => k.startsWith(PREFIX));
      await AsyncStorage.multiRemove(appKeys);
    } catch {
      // silent failure
    }
  },
};

export const STORAGE_KEYS = {
  SESSION: 'session',
  ITEMS: 'items',
  TRANSACTIONS: 'transactions',
  NOTIFICATIONS: 'notifications',
  PARTNERSHIPS: 'partnerships',
  SEEDED: 'seeded',
} as const;
