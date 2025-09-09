-- Development Database Initialization Script
-- This script sets up the development database with necessary extensions and initial data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create development-specific functions
CREATE OR REPLACE FUNCTION dev_reset_sequence(sequence_name text, table_name text, column_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('SELECT setval(''%s'', COALESCE((SELECT MAX(%s) FROM %s), 1))', 
                   sequence_name, column_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Create development user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dev_user') THEN
        CREATE ROLE dev_user WITH LOGIN PASSWORD 'dev_password';
    END IF;
END
$$;

-- Grant necessary permissions to dev_user
GRANT CONNECT ON DATABASE antsss_tattoo_dev TO dev_user;
GRANT USAGE ON SCHEMA public TO dev_user;
GRANT CREATE ON SCHEMA public TO dev_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dev_user;

-- Set up logging for development
CREATE TABLE IF NOT EXISTS dev_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster log queries
CREATE INDEX IF NOT EXISTS idx_dev_logs_created_at ON dev_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_dev_logs_level ON dev_logs(level);

-- Development-specific settings
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_min_duration_statement = 0;

-- Reload configuration
SELECT pg_reload_conf();