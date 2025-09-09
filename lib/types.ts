export type UserType = 'artist' | 'studio'

export interface Profile {
  id: string
  email: string
  full_name?: string
  user_type?: UserType
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
  zip_code?: string
  hourly_rate?: number
  amenities?: string[]
  images?: string[]
  is_active: boolean
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
  zip_code: string
  hourly_rate: number
  amenities: string[]
  images: File[]
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
  'Disposable Tubes'
] as const