-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('user-media', 'user-media', true);

-- Create policy for authenticated users to upload their own files
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for authenticated users to update their own files
CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for authenticated users to delete their own files
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for public read access
CREATE POLICY "Public read access for user media"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-media');