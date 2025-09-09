-- Test Database Initialization Script
-- This script sets up the test database with necessary extensions and test utilities

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create test-specific functions
CREATE OR REPLACE FUNCTION test_reset_all_data()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = replica;
    
    -- Delete all data from all tables except system tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    -- Reset all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create test user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'test_user') THEN
        CREATE ROLE test_user WITH LOGIN PASSWORD 'test_password';
    END IF;
END
$$;

-- Grant necessary permissions to test_user
GRANT CONNECT ON DATABASE antsss_tattoo_test TO test_user;
GRANT USAGE ON SCHEMA public TO test_user;
GRANT CREATE ON SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;

-- Create test utilities table
CREATE TABLE IF NOT EXISTS test_fixtures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to load test fixture
CREATE OR REPLACE FUNCTION load_test_fixture(fixture_name text)
RETURNS jsonb AS $$
DECLARE
    fixture_data jsonb;
BEGIN
    SELECT data INTO fixture_data 
    FROM test_fixtures 
    WHERE name = fixture_name;
    
    RETURN fixture_data;
END;
$$ LANGUAGE plpgsql;

-- Test-specific settings for faster execution
ALTER SYSTEM SET fsync = 'off';
ALTER SYSTEM SET synchronous_commit = 'off';
ALTER SYSTEM SET full_page_writes = 'off';
ALTER SYSTEM SET checkpoint_segments = 32;
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';

-- Reload configuration
SELECT pg_reload_conf();