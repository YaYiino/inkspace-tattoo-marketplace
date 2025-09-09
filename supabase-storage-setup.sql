-- Supabase Storage Setup for Profile Completion Flow
-- Run these commands in the Supabase SQL Editor

-- 1. Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('portfolio-images', 'portfolio-images', true),
  ('studio-images', 'studio-images', true);

-- 2. Set up Row Level Security policies for portfolio-images bucket
CREATE POLICY "Users can upload their own portfolio images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'portfolio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own portfolio images" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'portfolio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own portfolio images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'portfolio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own portfolio images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'portfolio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view portfolio images" ON storage.objects 
FOR SELECT USING (bucket_id = 'portfolio-images');

-- 3. Set up Row Level Security policies for studio-images bucket
CREATE POLICY "Users can upload their own studio images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'studio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own studio images" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'studio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own studio images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'studio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own studio images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'studio-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view studio images" ON storage.objects 
FOR SELECT USING (bucket_id = 'studio-images');

-- Note: You'll need to run these commands in your Supabase dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create the buckets manually if the INSERT commands don't work
-- 3. Set the buckets to public
-- 4. Apply the RLS policies above in the SQL Editor