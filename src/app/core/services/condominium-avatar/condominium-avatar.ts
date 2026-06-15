import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';

@Injectable({
  providedIn: 'root',
})
export class CondominiumAvatar {
  private client = inject(Supabase).client;

  /**
   * Uploads an avatar to the 'avatars' bucket.
   * @param  file - The file object from an <input type="file">
   * @returns  The public URL of the uploaded avatar, or null if it fails.
   */
  async uploadAvatar(file: File): Promise<string | null> {
    try {
      // 1. Get the currently logged-in user's ID
      const {
        data: { user },
        error: userError,
      } = await this.client.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to upload an avatar.');
      }

      const userId = user.id;
      // Extract the file extension (e.g., .jpg, .png)
      const fileExt = file.name.split('.').pop();
      const dateTime = new Date().getTime();

      // Define the path: 'userId/avatar.ext' (matches the RLS policy criteria)
      const filePath = `${userId}/avatar${dateTime}.${fileExt}`;

      // 2. Upload the file to the 'avatars' bucket
      // 'upsert: true' allows the user to overwrite their existing avatar seamlessly
      const { data, error: uploadError } = await this.client.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  }

  getAvatarUrl(filePath: string): string {
    const { data } = this.client.storage.from('avatars').getPublicUrl(filePath);

    return data.publicUrl;
  }
}
