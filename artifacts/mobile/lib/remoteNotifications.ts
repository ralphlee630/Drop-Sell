import { supabase } from './supabase';

/**
 * Ask the trusted Supabase Edge Function to deliver a persisted notification
 * through Expo Push to every device registered for the recipient.
 *
 * Notification rows remain the source of truth. A push delivery failure is
 * logged but never makes a successful marketplace mutation look unsuccessful.
 */
export async function sendRemoteNotification(
  notificationId: string,
  excludePushToken?: string
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-notification', {
    body: {
      notificationId,
      excludePushToken: excludePushToken || undefined,
    },
  });

  if (error) {
    console.warn('Remote notification delivery failed:', error.message);
  }
}