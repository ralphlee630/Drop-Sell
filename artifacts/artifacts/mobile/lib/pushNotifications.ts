/**
 * Push Notifications service for Drop & Sell.
 *
 * Three-layer approach:
 *  1. setNotificationHandler  – controls foreground display
 *  2. sendLocalNotification   – fires immediately on the current device
 *  3. sendExpoPushNotification – calls Expo's push endpoint for remote delivery
 *                               (used when the recipient's token is available; ready
 *                                for Supabase wiring but works as-is in demo mode)
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Foreground behaviour ──────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Token registration ────────────────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // Android: create a named channel so alerts have the right importance
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('dropsell', {
        name: 'Drop & Sell',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
        sound: 'default',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenResult.data;
  } catch {
    // Simulator / web / missing project ID — not fatal
    return null;
  }
}

// ─── Local (same-device) notification ─────────────────────────────────────
export interface LocalNotificationPayload {
  title: string;
  body: string;
  /** Deep-link data – handled in app/_layout.tsx notification response listener */
  data?: Record<string, string>;
}

export async function sendLocalNotification(payload: LocalNotificationPayload): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'dropsell' }),
      },
      trigger: null, // null = fire immediately
    });
  } catch {
    // Graceful – local notifications may be unavailable in some Expo Go builds
  }
}

// ─── Remote push via Expo Push API ────────────────────────────────────────
// Sends to a specific device identified by its Expo push token.
// In demo mode all users share one device, so this is mainly used when a seller's
// token differs from the current device (i.e. after Supabase is wired in).
export async function sendExpoPushNotification(opts: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!opts.to || !opts.to.startsWith('ExponentPushToken[')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: opts.to,
        title: opts.title,
        body: opts.body,
        data: opts.data ?? {},
        sound: 'default',
      }),
    });
  } catch {
    // Network failure is non-fatal
  }
}
