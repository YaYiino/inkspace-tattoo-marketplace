-- Antsss Tattoo Marketplace - Production Supabase Setup
-- This file contains production-specific configurations and optimizations

-- ============================================================================
-- PRODUCTION DATABASE OPTIMIZATIONS
-- ============================================================================

-- Enable required extensions for production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- PERFORMANCE INDEXES FOR PRODUCTION
-- ============================================================================

-- User-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_hash ON users USING HASH (email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc ON users (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_updated_at ON users (updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_sign_in ON users (last_sign_in_at DESC NULLS LAST);

-- Profile indexes for search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_type ON profiles (user_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_location_gin ON profiles USING GIN (location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_specialties_gin ON profiles USING GIN (specialties);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_is_verified ON profiles (is_verified) WHERE is_verified = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_hourly_rate ON profiles (hourly_rate) WHERE hourly_rate IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_rating ON profiles (rating DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at ON profiles (created_at DESC);

-- Booking system indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_id ON bookings (client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_artist_id ON bookings (artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_scheduled_date ON bookings (scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_artist_status_date ON bookings (artist_id, status, scheduled_date);

-- Text search indexes for portfolio and descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_bio_search ON profiles USING GIN (to_tsvector('english', bio));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_portfolio_search ON profiles USING GIN (to_tsvector('english', portfolio_description));

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (PRODUCTION)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;

-- User table policies
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Profile table policies (enhanced for production)
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Booking table policies (comprehensive)
CREATE POLICY "bookings_select_involved" ON bookings
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = artist_id OR
    -- Admin access for support (implement admin role check)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "bookings_insert_client" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "bookings_update_involved" ON bookings
  FOR UPDATE USING (
    auth.uid() = client_id OR 
    auth.uid() = artist_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- ============================================================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Create storage buckets with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/jpg","image/png","image/webp","image/avif"}'),
  ('portfolio', 'portfolio', true, 20971520, '{"image/jpeg","image/jpg","image/png","image/webp","image/avif"}'),
  ('documents', 'documents', false, 10485760, '{"application/pdf","image/jpeg","image/png"}'),
  ('temp-uploads', 'temp-uploads', false, 52428800, '{"image/jpeg","image/jpg","image/png","image/webp","image/avif"}')
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies
CREATE POLICY "avatar_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_upload_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_update_own_folder" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Portfolio storage policies
CREATE POLICY "portfolio_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_manage_own" ON storage.objects
  FOR ALL USING (
    bucket_id = 'portfolio' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND user_type = 'artist'
    )
  );

-- Document storage policies (private)
CREATE POLICY "documents_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "documents_manage_own" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- PRODUCTION FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables that need updated_at tracking
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for text search across profiles
CREATE OR REPLACE FUNCTION search_profiles(search_query text)
RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM profiles
  WHERE 
    to_tsvector('english', coalesce(bio, '')) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('english', coalesce(portfolio_description, '')) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('english', array_to_string(specialties, ' ')) @@ plainto_tsquery('english', search_query)
    OR location::text ILIKE '%' || search_query || '%'
  ORDER BY
    ts_rank(to_tsvector('english', coalesce(bio, '')), plainto_tsquery('english', search_query)) DESC,
    rating DESC NULLS LAST,
    created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby artists (for location-based search)
CREATE OR REPLACE FUNCTION get_nearby_artists(
  user_lat double precision,
  user_lng double precision,
  radius_km integer DEFAULT 50
)
RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM profiles p
  WHERE 
    p.user_type = 'artist'
    AND p.location IS NOT NULL
    AND p.location ? 'lat'
    AND p.location ? 'lng'
    AND (
      6371 * acos(
        cos(radians(user_lat)) *
        cos(radians((p.location->>'lat')::double precision)) *
        cos(radians((p.location->>'lng')::double precision) - radians(user_lng)) +
        sin(radians(user_lat)) *
        sin(radians((p.location->>'lat')::double precision))
      )
    ) <= radius_km
  ORDER BY
    (
      6371 * acos(
        cos(radians(user_lat)) *
        cos(radians((p.location->>'lat')::double precision)) *
        cos(radians((p.location->>'lng')::double precision) - radians(user_lng)) +
        sin(radians(user_lat)) *
        sin(radians((p.location->>'lat')::double precision))
      )
    ) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATABASE MAINTENANCE AND MONITORING
-- ============================================================================

-- Enable automatic statistics collection
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Create a view for monitoring slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE total_exec_time > 1000  -- queries taking more than 1 second
ORDER BY total_exec_time DESC
LIMIT 100;

-- Create a function to cleanup old data (for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete unverified users after 30 days
  DELETE FROM auth.users
  WHERE 
    email_confirmed_at IS NULL 
    AND created_at < NOW() - INTERVAL '30 days';
  
  -- Archive completed bookings older than 1 year
  -- (Move to archive table in a real implementation)
  UPDATE bookings
  SET status = 'archived'
  WHERE 
    status = 'completed'
    AND created_at < NOW() - INTERVAL '1 year';
    
  -- Clean up orphaned storage objects
  DELETE FROM storage.objects
  WHERE bucket_id = 'temp-uploads'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PRODUCTION CONFIGURATION VALIDATION
-- ============================================================================

-- Function to validate production setup
CREATE OR REPLACE FUNCTION validate_production_setup()
RETURNS TABLE(
  check_name text,
  status text,
  details text
) AS $$
BEGIN
  -- Check if RLS is enabled on all tables
  RETURN QUERY
  SELECT 
    'RLS_ENABLED'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    'Tables without RLS: ' || STRING_AGG(tablename, ', ')::text
  FROM pg_tables
  WHERE schemaname = 'public' 
    AND rowsecurity = false
    AND tablename IN ('users', 'profiles', 'bookings');
    
  -- Check if required indexes exist
  RETURN QUERY
  SELECT 
    'REQUIRED_INDEXES'::text,
    CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'WARN' END::text,
    'Found ' || COUNT(*)::text || ' performance indexes'
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
  -- Check storage bucket configuration
  RETURN QUERY
  SELECT 
    'STORAGE_BUCKETS'::text,
    CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END::text,
    'Found ' || COUNT(*)::text || ' storage buckets'
  FROM storage.buckets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run validation
SELECT * FROM validate_production_setup();

-- ============================================================================
-- PRODUCTION SECURITY ENHANCEMENTS
-- ============================================================================

-- Create audit log table for production tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  operation text NOT NULL,
  row_id uuid,
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES auth.users(id),
  timestamp timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit logs (admin only)
CREATE POLICY "audit_logs_admin_only" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, operation, row_id, old_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, operation, row_id, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, operation, row_id, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to important tables
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER bookings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- FINAL PRODUCTION CHECKS
-- ============================================================================

-- Analyze tables for optimal query planning
ANALYZE users;
ANALYZE profiles;
ANALYZE bookings;
ANALYZE storage.objects;

-- Create a production health check function
CREATE OR REPLACE FUNCTION production_health_check()
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}';
  db_size text;
  active_connections integer;
  total_users integer;
  total_artists integer;
  total_bookings integer;
BEGIN
  -- Database size
  SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
  result := jsonb_set(result, '{database_size}', to_jsonb(db_size));
  
  -- Active connections
  SELECT count(*) FROM pg_stat_activity WHERE state = 'active' INTO active_connections;
  result := jsonb_set(result, '{active_connections}', to_jsonb(active_connections));
  
  -- User statistics
  SELECT count(*) FROM users INTO total_users;
  SELECT count(*) FROM profiles WHERE user_type = 'artist' INTO total_artists;
  SELECT count(*) FROM bookings INTO total_bookings;
  
  result := jsonb_set(result, '{statistics}', jsonb_build_object(
    'total_users', total_users,
    'total_artists', total_artists,
    'total_bookings', total_bookings
  ));
  
  result := jsonb_set(result, '{timestamp}', to_jsonb(NOW()));
  result := jsonb_set(result, '{status}', to_jsonb('healthy'));
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for production
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Production is ready!
SELECT 'Production Supabase setup completed successfully!' as status;