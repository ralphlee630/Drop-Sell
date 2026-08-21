/**
 * Photo storage utility for Drop & Sell.
 *
 * Picks from camera roll → compresses to ≤1200px / 80% quality →
 * copies into the app's permanent document directory so the URI
 * survives app restarts without a cloud backend.
 *
 * When Supabase Storage is wired in, swap `persistPhoto` for a real
 * upload call and return the remote URL instead.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

const PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}item-photos/`;

/** Ensure the item-photos directory exists. */
async function ensureDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export interface PersistedPhoto {
  /** Permanent file:// URI safe to store in AsyncStorage and render with expo-image */
  uri: string;
  /** Width in pixels after resize */
  width: number;
  /** Height in pixels after resize */
  height: number;
}

/**
 * Compress and copy a temporary picker URI into the app's document directory.
 *
 * @param tempUri  The `uri` returned by `expo-image-picker`
 * @returns        A `PersistedPhoto` with a permanent local URI, or null on web
 */
export async function persistPhoto(tempUri: string): Promise<PersistedPhoto | null> {
  if (Platform.OS === 'web') {
    // On web, the data URI from the picker is already usable as-is (no file system)
    return { uri: tempUri, width: 0, height: 0 };
  }

  // 1. Compress & resize (max 1200px wide, 80% JPEG quality)
  const manipResult = await ImageManipulator.manipulateAsync(
    tempUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2. Ensure destination directory exists
  await ensureDir();

  // 3. Build a stable filename based on timestamp
  const filename = `item-${Date.now()}.jpg`;
  const destUri = `${PHOTO_DIR}${filename}`;

  // 4. Copy from the temp cache location to the permanent document directory
  await FileSystem.copyAsync({ from: manipResult.uri, to: destUri });

  return { uri: destUri, width: manipResult.width, height: manipResult.height };
}

/**
 * Delete a previously persisted photo (called if the seller removes the image
 * or replaces it with a new one).
 */
export async function deletePhoto(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Non-fatal — stale files are harmless
  }
}
