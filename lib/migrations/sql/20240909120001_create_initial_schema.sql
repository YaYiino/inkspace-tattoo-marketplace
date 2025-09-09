-- UP
-- Create initial database schema for Antsss Tattoo Marketplace

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users profile table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    date_of_birth DATE,
    role TEXT CHECK (role IN ('client', 'artist', 'studio')) DEFAULT 'client',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create studios table
CREATE TABLE IF NOT EXISTS studios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT DEFAULT 'US',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone TEXT,
    email TEXT,
    website TEXT,
    instagram TEXT,
    facebook TEXT,
    twitter TEXT,
    price_range TEXT CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
    specialties TEXT[],
    amenities TEXT[],
    hours JSONB,
    images TEXT[],
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    studio_id UUID REFERENCES studios(id),
    name TEXT NOT NULL,
    bio TEXT,
    specialties TEXT[],
    experience_years INTEGER,
    hourly_rate DECIMAL(10, 2),
    booking_lead_time INTEGER DEFAULT 7,
    portfolio_images TEXT[],
    instagram TEXT,
    facebook TEXT,
    twitter TEXT,
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_user_id UUID REFERENCES auth.users(id) NOT NULL,
    artist_id UUID REFERENCES artists(id) NOT NULL,
    studio_id UUID REFERENCES studios(id) NOT NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours DECIMAL(4, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    description TEXT,
    design_references TEXT[],
    estimated_price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
    artist_id UUID REFERENCES artists(id),
    studio_id UUID REFERENCES studios(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    images TEXT[],
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table (for booking communication)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL,
    attachments TEXT[],
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_studios_city_state ON studios(city, state);
CREATE INDEX IF NOT EXISTS idx_studios_verified ON studios(verified);
CREATE INDEX IF NOT EXISTS idx_studios_featured ON studios(featured);
CREATE INDEX IF NOT EXISTS idx_artists_studio_id ON artists(studio_id);
CREATE INDEX IF NOT EXISTS idx_artists_verified ON artists(verified);
CREATE INDEX IF NOT EXISTS idx_bookings_client_user_id ON bookings(client_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_artist_id ON bookings(artist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_studio_id ON bookings(studio_id);
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_artist_id ON reviews(artist_id);
CREATE INDEX IF NOT EXISTS idx_reviews_studio_id ON reviews(studio_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON studios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN
-- Drop triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_studios_updated_at ON studios;
DROP TRIGGER IF EXISTS update_artists_updated_at ON artists;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_studios_city_state;
DROP INDEX IF EXISTS idx_studios_verified;
DROP INDEX IF EXISTS idx_studios_featured;
DROP INDEX IF EXISTS idx_artists_studio_id;
DROP INDEX IF EXISTS idx_artists_verified;
DROP INDEX IF EXISTS idx_bookings_client_user_id;
DROP INDEX IF EXISTS idx_bookings_artist_id;
DROP INDEX IF EXISTS idx_bookings_studio_id;
DROP INDEX IF EXISTS idx_bookings_appointment_date;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_reviews_artist_id;
DROP INDEX IF EXISTS idx_reviews_studio_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_messages_booking_id;
DROP INDEX IF EXISTS idx_messages_recipient_id;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS studios;
DROP TABLE IF EXISTS user_profiles;