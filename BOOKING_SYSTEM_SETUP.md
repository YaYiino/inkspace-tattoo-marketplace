# Antsss Tattoo Marketplace - Complete Booking System Setup

This document outlines the complete booking system implementation for the Antsss tattoo marketplace, including database setup, features, and deployment instructions.

## 🚀 System Overview

The booking system provides a complete marketplace experience connecting tattoo artists with studio owners. It includes:

- **Booking Flow**: Artists can browse studios, view availability, and submit booking requests
- **Studio Management**: Studio owners can manage availability, approve/decline requests
- **Real-time Messaging**: Built-in communication system between artists and studios
- **Notifications**: Real-time notifications for booking updates and messages
- **Dashboard Integration**: Complete booking management for both user types
- **Calendar Views**: Visual calendar integration showing bookings and availability

## 📋 Database Schema

### 1. Apply the Booking System Schema

First, apply the extended database schema to your Supabase project:

```sql
-- Run the contents of supabase-booking-schema.sql in your Supabase SQL editor
```

The schema includes:

- **bookings**: Main booking records with status tracking
- **messages**: Artist-studio communication system
- **notifications**: User notification system
- **booking_reviews**: Future review system
- **studio_availability**: Time slot management for studios

### 2. Database Functions & Triggers

The schema includes several automated functions:

- **Booking Notifications**: Auto-create notifications when bookings are created/updated
- **Message Notifications**: Notify users of new messages
- **Conflict Detection**: Check for booking time conflicts
- **Auto-completion**: Mark bookings as completed after end time
- **Availability Queries**: Get studio availability for date ranges

## 🛠️ Core Components

### Booking Modal (`BookingModal.tsx`)
- **Location**: `/app/components/BookingModal.tsx`
- **Features**: Complete booking flow with date/time selection, pricing calculation, and form validation
- **Integration**: Connected to `StudioBookingCard` component
- **Validation**: Conflict checking, time validation, user authentication

### Booking Management (`BookingsList.tsx`)
- **Location**: `/app/components/BookingsList.tsx`
- **Features**: Filter bookings by status, approve/decline requests, messaging integration
- **User Types**: Different views for artists vs studios
- **Actions**: Status updates, cancellations, messaging

### Messaging System (`BookingMessages.tsx`)
- **Location**: `/app/components/BookingMessages.tsx`
- **Features**: Real-time messaging, read receipts, message history
- **Integration**: Embedded in booking management interface
- **Real-time**: Uses Supabase subscriptions for live updates

### Calendar Integration (`BookingsCalendar.tsx`)
- **Location**: `/app/components/BookingsCalendar.tsx`
- **Features**: Visual calendar view, booking indicators, date selection
- **Views**: Monthly calendar with booking status indicators
- **Interactive**: Click dates to see booking details

### Notifications (`NotificationsList.tsx`)
- **Location**: `/app/components/NotificationsList.tsx`
- **Features**: Real-time notifications, read/unread status, categorized by type
- **Integration**: Notification bell in navigation with unread count
- **Types**: Booking requests, confirmations, cancellations, messages, reminders

## 🎨 Updated Dashboards

### Artist Dashboard
- **Location**: `/app/dashboard/artist/page.tsx`
- **Features**: 
  - Real booking statistics (earnings, pending requests, completed sessions)
  - Tabbed interface (Overview, Bookings, Calendar)
  - Recent bookings preview with quick actions
  - Portfolio integration

### Studio Dashboard
- **Location**: `/app/dashboard/studio/page.tsx`
- **Features**:
  - Booking request management with approve/decline actions
  - Revenue tracking and analytics
  - Calendar integration showing confirmed bookings
  - Quick access to availability management

## 🔧 Integration Points

### Studio Detail Pages
- **Enhanced Booking Card**: Simplified UI with modal integration
- **Availability Display**: Real-time availability checking
- **Pricing Calculation**: Dynamic cost calculation based on duration and rates

### Navigation Enhancement
- **Notification Bell**: Real-time unread count with dropdown
- **User State Management**: Session tracking and notification subscriptions
- **Real-time Updates**: Live notification updates via Supabase channels

## 📱 Key Features Implemented

### 1. Complete Booking Flow
```typescript
// Booking creation with validation
const bookingData = {
  studio_id: studio.id,
  artist_id: userArtist.id,
  start_datetime: startDateTime,
  end_datetime: endDateTime,
  total_hours: duration,
  hourly_rate: studio.hourly_rate || 0,
  total_amount: totalCost,
  booking_notes: bookingNotes.trim() || null,
  artist_requirements: artistRequirements.trim() || null,
  status: 'pending' as const
}
```

### 2. Real-time Messaging
```typescript
// Subscribe to messages for real-time updates
const subscription = supabase
  .channel(`messages:booking_id=eq.${booking.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `booking_id=eq.${booking.id}`
  }, (payload) => {
    loadMessages()
  })
  .subscribe()
```

### 3. Automated Notifications
```sql
-- Trigger for booking notifications
CREATE TRIGGER trigger_booking_notification
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_notification();
```

### 4. Conflict Detection
```sql
-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_studio_id UUID,
  p_start_datetime TIMESTAMP WITH TIME ZONE,
  p_end_datetime TIMESTAMP WITH TIME ZONE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
```

## 🚀 Deployment Instructions

### 1. Database Migration
```bash
# Apply the booking system schema
# Copy contents of supabase-booking-schema.sql
# Paste into Supabase SQL Editor
# Execute the migration
```

### 2. Environment Setup
Ensure your `.env.local` includes:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Row Level Security (RLS) Policies
The schema includes comprehensive RLS policies for:
- **Bookings**: Users can only see their own bookings
- **Messages**: Users can only see messages they sent/received  
- **Notifications**: Users can only see their own notifications
- **Availability**: Public read access, studio owner write access

### 4. Real-time Subscriptions
Enable real-time for the following tables in Supabase:
- `bookings`
- `messages`
- `notifications`

### 5. Storage (Future Enhancement)
For file uploads (portfolio images, studio photos), configure Supabase Storage:
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('portfolio-images', 'portfolio-images', true),
('studio-images', 'studio-images', true);
```

## 🧪 Testing the System

### 1. Create Test Users
- Register as both an artist and a studio owner
- Complete profile setup for both user types

### 2. Test Booking Flow
1. **As Studio Owner**: Set up studio availability
2. **As Artist**: Browse studios and create booking request
3. **As Studio Owner**: Approve/decline the request
4. **Both Users**: Test messaging system
5. **Check Notifications**: Verify real-time notifications work

### 3. Test Calendar Integration
- Verify bookings appear in calendar views
- Test date navigation and booking details
- Confirm real-time updates work

## 📈 Analytics & Monitoring

### Key Metrics to Track
```sql
-- Booking conversion rates
SELECT 
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Revenue by studio
SELECT 
  s.name,
  SUM(b.total_amount) as total_revenue,
  COUNT(*) as booking_count
FROM bookings b
JOIN studios s ON s.id = b.studio_id
WHERE b.status = 'completed'
GROUP BY s.id, s.name
ORDER BY total_revenue DESC;

-- Message activity
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as message_count
FROM messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;
```

## 🔮 Future Enhancements

### Payment Integration
- Stripe integration for booking payments
- Escrow system for secure transactions
- Automated payouts to studios

### Advanced Features
- Recurring bookings
- Group bookings for events
- Studio equipment rental
- Artist availability matching

### Mobile App
- React Native implementation
- Push notifications
- Offline booking management

## 🛠️ Troubleshooting

### Common Issues

1. **Booking Conflicts Not Detected**
   - Check if `check_booking_conflict` function is properly created
   - Verify RLS policies don't block conflict checking

2. **Real-time Updates Not Working**
   - Confirm Supabase real-time is enabled for tables
   - Check subscription setup in components
   - Verify user authentication state

3. **Notifications Not Appearing**
   - Check trigger functions are created
   - Verify notification policies allow user access
   - Test notification subscription in Navigation component

4. **Messages Not Loading**
   - Verify message RLS policies
   - Check booking relationship joins
   - Confirm user authentication

### Performance Optimization

1. **Database Indexes**
```sql
-- Add indexes for better query performance
CREATE INDEX idx_bookings_artist_studio ON bookings(artist_id, studio_id);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

2. **Query Optimization**
- Use appropriate select fields instead of `*`
- Implement pagination for large result sets
- Cache frequently accessed data

## 📞 Support

For technical support or feature requests:
1. Check this documentation first
2. Review the component source code
3. Test with the provided SQL queries
4. Ensure all dependencies are properly installed

The booking system is now complete and ready for production deployment!