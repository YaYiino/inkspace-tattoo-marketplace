-- UP
-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(14) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
ON schema_migrations(executed_at);

-- Create function to execute arbitrary SQL (for migrations)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

-- Create function to create migrations table (idempotent)
CREATE OR REPLACE FUNCTION create_migrations_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(14) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
    ON schema_migrations(executed_at);
END;
$$;

-- DOWN
-- Drop migration functions
DROP FUNCTION IF EXISTS create_migrations_table();
DROP FUNCTION IF EXISTS exec_sql(TEXT);

-- Drop migrations table
DROP INDEX IF EXISTS idx_schema_migrations_executed_at;
DROP TABLE IF EXISTS schema_migrations;