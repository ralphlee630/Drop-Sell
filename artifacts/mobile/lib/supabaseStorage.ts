import { supabase } from './supabase';

const BUCKET = 'item-photos';

/**
 * Upload a picked local photo to Supabase Storage and return its public URL.
 * The bucket is public for buyer-facing item photos; the SQL migration creates
 * the bucket and its upload policies.
 */
export async function uploadItemPhoto(localUri: string, userId: string, itemId: string): Promise<string> {
  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Unable to read the selected photo');

  const blob = await response.blob();
  const path = `${userId}/${itemId}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: true,
  });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}