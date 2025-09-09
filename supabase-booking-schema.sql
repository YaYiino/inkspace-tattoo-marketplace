-- Booking System Extension for Antsss Tattoo Marketplace
-- This extends the existing schema with booking, messaging, and notification features

-- Create booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create notification type enum  
CREATE TYPE notification_type AS ENUM ('booking_request', 'booking_confirmed', 'booking_cancelled', 'message_received', 'booking_reminder');

-- Extend studio availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS studio_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  price_override DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(studio_id, date, start_time, end_time)
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  total_hours DECIMAL(4,2) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status booking_status DEFAULT 'pending' NOT NULL,
  booking_notes TEXT,
  artist_requirements TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_booking_times CHECK (end_datetime > start_datetime),
  CONSTRAINT positive_amounts CHECK (total_hours > 0 AND hourly_rate >= 0 AND total_amount >= 0)
);

-- Create messages table for artist-studio communication
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking reviews table (for future use)
CREATE TABLE booking_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id)
);

-- Enable RLS on all new tables
ALTER TABLE studio_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for studio_availability
CREATE POLICY "Studio owners can manage their availability" ON studio_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM studios 
      WHERE studios.id = studio_availability.studio_id 
      AND studios.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view available studio slots" ON studio_availability
  FOR SELECT USING (is_available = TRUE);

-- Create RLS policies for bookings
CREATE POLICY "Artists can view their bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = bookings.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Studios can view their bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studios 
      WHERE studios.id = bookings.studio_id 
      AND studios.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can create booking requests" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = bookings.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can update their booking requests" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM artists 
      WHERE artists.id = bookings.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Studios can update bookings for their studio" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM studios 
      WHERE studios.id = bookings.studio_id 
      AND studios.user_id = auth.uid()
    )
  );

-- Create RLS policies for messages
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages" ON messages
  FOR UPDATE USING (recipient_id = auth.uid());

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for booking_reviews
CREATE POLICY "Users can view all reviews" ON booking_reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create reviews for their bookings" ON booking_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON booking_reviews
  FOR UPDATE USING (reviewer_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_bookings_studio_id ON bookings(studio_id);
CREATE INDEX idx_bookings_artist_id ON bookings(artist_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_datetime ON bookings(start_datetime);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_studio_availability_studio_date ON studio_availability(studio_id, date);

-- Function to create notification when booking is created
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify studio owner about new booking request
  INSERT INTO notifications (user_id, type, title, message, booking_id)
  SELECT 
    s.user_id,
    'booking_request',
    'New Booking Request',
    'You have received a new booking request from ' || p.full_name,
    NEW.id
  FROM studios s
  JOIN artists a ON a.id = NEW.artist_id
  JOIN profiles p ON p.id = a.user_id
  WHERE s.id = NEW.studio_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when booking status changes
CREATE OR REPLACE FUNCTION create_booking_status_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        -- Notify artist that booking was confirmed
        INSERT INTO notifications (user_id, type, title, message, booking_id)
        SELECT 
          a.user_id,
          'booking_confirmed',
          'Booking Confirmed',
          'Your booking at ' || s.name || ' has been confirmed!',
          NEW.id
        FROM artists a
        JOIN studios s ON s.id = NEW.studio_id
        WHERE a.id = NEW.artist_id;
        
      WHEN 'cancelled' THEN
        -- Notify the other party about cancellation
        IF NEW.cancelled_by IS NOT NULL THEN
          INSERT INTO notifications (user_id, type, title, message, booking_id)
          SELECT 
            CASE 
              WHEN NEW.cancelled_by = a.user_id THEN s.user_id
              ELSE a.user_id
            END,
            'booking_cancelled',
            'Booking Cancelled',
            'A booking has been cancelled',
            NEW.id
          FROM artists a
          JOIN studios s ON s.id = NEW.studio_id
          WHERE a.id = NEW.artist_id;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create message notification
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, booking_id)
  SELECT 
    NEW.recipient_id,
    'message_received',
    'New Message',
    'You have received a new message about your booking',
    NEW.booking_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically mark booking as completed after end time
CREATE OR REPLACE FUNCTION auto_complete_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings 
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE 
    status = 'confirmed' 
    AND end_datetime < NOW() - INTERVAL '1 hour'
    AND completed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_booking_notification
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_notification();

CREATE TRIGGER trigger_booking_status_notification
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_status_notification();

CREATE TRIGGER trigger_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION create_message_notification();

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_studio_id UUID,
  p_start_datetime TIMESTAMP WITH TIME ZONE,
  p_end_datetime TIMESTAMP WITH TIME ZONE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE studio_id = p_studio_id
    AND status IN ('confirmed', 'pending')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      (start_datetime <= p_start_datetime AND end_datetime > p_start_datetime)
      OR (start_datetime < p_end_datetime AND end_datetime >= p_end_datetime)
      OR (start_datetime >= p_start_datetime AND end_datetime <= p_end_datetime)
    );
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get studio availability for a date range
CREATE OR REPLACE FUNCTION get_studio_availability(
  p_studio_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN,
  is_booked BOOLEAN,
  price_override DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH availability AS (
    SELECT 
      sa.date,
      sa.start_time,
      sa.end_time,
      sa.is_available,
      sa.price_override,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM bookings b 
          WHERE b.studio_id = p_studio_id
            AND b.status IN ('confirmed', 'pending')
            AND DATE(b.start_datetime) = sa.date
            AND TIME(b.start_datetime) < sa.end_time
            AND TIME(b.end_datetime) > sa.start_time
        ) THEN TRUE
        ELSE FALSE
      END as is_booked
    FROM studio_availability sa
    WHERE sa.studio_id = p_studio_id
      AND sa.date BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    a.date,
    a.start_time,
    a.end_time,
    a.is_available,
    a.is_booked,
    a.price_override
  FROM availability a
  ORDER BY a.date, a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;