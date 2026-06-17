-- 1. Create the 'avatars' bucket
INSERT INTO
    storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- 2. Create Policy: Allow public read access to all avatars
CREATE POLICY "Allow public read access" ON storage.objects FOR
SELECT
    TO public USING (bucket_id = 'avatars');

-- 3. Create Policy: Allow authenticated users to upload avatars
-- This enforces that the user can only upload files to a path that matches their user ID
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (auth.uid()::text = (storage.foldername(name))[1] 
         OR auth.uid()::text = name)
);

-- 4. Create Policy: Allow users to update their own avatars
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (auth.uid()::text = (storage.foldername(name))[1] 
         OR auth.uid()::text = name)
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND (auth.uid()::text = (storage.foldername(name))[1] 
         OR auth.uid()::text = name)
);

-- 5. Create Policy: Allow users to delete their own avatars
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (auth.uid()::text = (storage.foldername(name))[1] 
         OR auth.uid()::text = name)
);