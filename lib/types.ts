export type UserRole = 'artist' | 'studio'
export type UserType = 'artist' | 'studio' // Keep for backward compatibility

export interface Profile {
  id: string
  email: string
  full_name?: string
  role?: UserRole
  user_type?: UserType // Keep for backward compatibility
  created_at: string
  updated_at: string
}

export interface Artist {
  id: string
  user_id: string
  bio?: string
  experience_years?: number
  specialties?: string[]
  license_number?: string
  license_state?: string
  is_verified: boolean
  portfolio_images?: string[]
  created_at: string
  updated_at: string
}

export interface Studio {
  id: string
  user_id: string
  name: string
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  zip_code?: string
  latitude?: number
  longitude?: number
  hourly_rate?: number
  daily_rate?: number
  amenities?: string[]
  equipment?: string[]
  images?: string[]
  policies?: string
  requirements?: string
  is_active: boolean
  instant_book?: boolean
  min_booking_hours?: number
  max_booking_hours?: number
  cancellation_policy?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      artists: {
        Row: Artist
        Insert: Omit<Artist, 'id' | 'created_at' | 'updated_at' | 'is_verified'> & {
          id?: string
          created_at?: string
          updated_at?: string
          is_verified?: boolean
        }
        Update: Partial<Omit<Artist, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      studios: {
        Row: Studio
        Insert: Omit<Studio, 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
          id?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: Partial<Omit<Studio, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      studio_availability: {
        Row: StudioAvailability
        Insert: Omit<StudioAvailability, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<StudioAvailability, 'id' | 'studio_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Booking, 'id' | 'studio_id' | 'artist_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Message, 'id' | 'booking_id' | 'sender_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Notification, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      booking_reviews: {
        Row: BookingReview
        Insert: Omit<BookingReview, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<BookingReview, 'id' | 'booking_id' | 'reviewer_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
    }
  }
}

// Form data interfaces
export interface ArtistFormData {
  full_name: string
  bio: string
  experience_years: number
  specialties: string[]
  portfolio_images: File[]
}

export interface StudioFormData {
  name: string
  description: string
  address: string
  city: string
  state: string
  country: string
  zip_code: string
  hourly_rate: number
  daily_rate: number
  amenities: string[]
  equipment: string[]
  images: File[]
  policies: string
  requirements: string
  instant_book: boolean
  min_booking_hours: number
  max_booking_hours: number
  cancellation_policy: string
}

export interface AvailabilityFormData {
  date: string
  start_time: string
  end_time: string
  price_override?: number
}

export interface BookingFormData {
  studio_id: string
  start_datetime: string
  end_datetime: string
  booking_notes?: string
  artist_requirements?: string
}

export interface MessageFormData {
  booking_id: string
  message_text: string
}

export const ARTIST_SPECIALTIES = [
  'Traditional',
  'Realism',
  'Geometric',
  'Watercolor',
  'Black & Grey',
  'Japanese',
  'Tribal',
  'New School',
  'Old School',
  'Portrait',
  'Fine Line',
  'Dotwork',
  'Script/Lettering',
  'Biomechanical',
  'Neo-Traditional'
] as const

// New types for marketplace functionality
export interface StudioAvailability {
  id: string
  studio_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  price_override?: number
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  studio_id: string
  artist_id: string
  start_datetime: string
  end_datetime: string
  total_hours: number
  hourly_rate: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  booking_notes?: string
  artist_requirements?: string
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
  confirmed_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  studio?: Studio
  artist?: Artist
}

export interface Message {
  id: string
  booking_id: string
  sender_id: string
  recipient_id: string
  message_text: string
  is_read: boolean
  created_at: string
  updated_at: string
  sender?: Profile
  recipient?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: 'booking_request' | 'booking_confirmed' | 'booking_cancelled' | 'message_received' | 'booking_reminder'
  title: string
  message: string
  booking_id?: string
  is_read: boolean
  created_at: string
  updated_at: string
  booking?: Booking
}

export interface BookingReview {
  id: string
  booking_id: string
  reviewer_id: string
  rating: number
  review_text?: string
  created_at: string
  updated_at: string
  reviewer?: Profile
}

export interface StudioSearch {
  query?: string
  city?: string
  state?: string
  country?: string
  min_price?: number
  max_price?: number
  amenities?: string[]
  equipment?: string[]
  available_from?: string
  available_to?: string
  instant_book?: boolean
}

export const STUDIO_AMENITIES = [
  'WiFi',
  'Air Conditioning',
  'Private Rooms',
  'Sterile Equipment',
  'Aftercare Products',
  'Parking Available',
  'Music System',
  'Comfortable Seating',
  'Consultation Room',
  'Autoclave Sterilization',
  'Single-use Needles',
  'Disposable Tubes',
  'Waiting Area',
  '24/7 Access',
  'Security System',
  'Natural Light',
  'Food & Drinks Nearby',
  'Public Transport Access'
] as const

export const STUDIO_EQUIPMENT = [
  'Tattoo Machines',
  'Power Supply',
  'Needles & Cartridges',
  'Ink Selection',
  'Disposable Tubes',
  'Barrier Film',
  'Green Soap',
  'Paper Towels',
  'Gloves',
  'Masks',
  'Tattoo Chairs',
  'Adjustable Lighting',
  'Magnifying Glass',
  'Stencil Paper',
  'Transfer Solution',
  'Aftercare Products'
] as const

export const CANCELLATION_POLICIES = [
  'Flexible: Full refund 24 hours prior',
  'Moderate: 50% refund 48 hours prior',
  'Strict: No refund less than 7 days prior'
] as const