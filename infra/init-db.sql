-- Initialize SLMS Database
-- This script runs when the PostgreSQL container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema
CREATE SCHEMA IF NOT EXISTS slms;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA slms TO slms;

-- Set default search path
ALTER DATABASE slms SET search_path TO slms, public;

-- Create initial admin user (password: Admin@123)
-- This will be handled by the application, but we set up the structure

COMMENT ON DATABASE slms IS 'Sustainability Certification and Licensing Management System';
