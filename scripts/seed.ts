#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SeedData {
  studios: any[]
  artists: any[]
  users: any[]
  bookings: any[]
}

const mockData: SeedData = {
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'artist1@example.com',
      user_metadata: {
        full_name: 'Sarah Johnson',
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
      }
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'studio1@example.com',
      user_metadata: {
        full_name: 'Ink Masters Studio',
        avatar_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=150'
      }
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'client1@example.com',
      user_metadata: {
        full_name: 'Mike Wilson',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      }
    }
  ],
  studios: [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Ink Masters Studio',
      description: 'Premier tattoo studio specializing in realistic and traditional styles',
      address: '123 Main Street, Los Angeles, CA 90210',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90210',
      phone: '(555) 123-4567',
      email: 'info@inkmastersla.com',
      website: 'https://inkmastersla.com',
      instagram: '@inkmastersla',
      price_range: '$$',
      specialties: ['Realistic', 'Traditional', 'Black & Gray'],
      amenities: ['Parking Available', 'Walk-ins Welcome', 'Private Rooms'],
      hours: {
        monday: '10:00 AM - 8:00 PM',
        tuesday: '10:00 AM - 8:00 PM',
        wednesday: '10:00 AM - 8:00 PM',
        thursday: '10:00 AM - 8:00 PM',
        friday: '10:00 AM - 10:00 PM',
        saturday: '10:00 AM - 10:00 PM',
        sunday: 'Closed'
      },
      rating: 4.8,
      total_reviews: 127,
      verified: true,
      featured: true,
      user_id: '00000000-0000-0000-0000-000000000002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Urban Ink Collective',
      description: 'Modern tattoo collective focusing on contemporary and minimalist designs',
      address: '456 Sunset Blvd, West Hollywood, CA 90069',
      city: 'West Hollywood',
      state: 'CA',
      zip_code: '90069',
      phone: '(555) 987-6543',
      email: 'hello@urbanikcollective.com',
      website: 'https://urbanikcollective.com',
      instagram: '@urbanikcollective',
      price_range: '$$$',
      specialties: ['Minimalist', 'Geometric', 'Fine Line'],
      amenities: ['Vegan Friendly', 'Custom Designs', 'Consultation Available'],
      hours: {
        monday: 'Closed',
        tuesday: '11:00 AM - 7:00 PM',
        wednesday: '11:00 AM - 7:00 PM',
        thursday: '11:00 AM - 7:00 PM',
        friday: '11:00 AM - 9:00 PM',
        saturday: '10:00 AM - 9:00 PM',
        sunday: '12:00 PM - 6:00 PM'
      },
      rating: 4.6,
      total_reviews: 89,
      verified: true,
      featured: false,
      user_id: '00000000-0000-0000-0000-000000000002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  artists: [
    {
      id: '20000000-0000-0000-0000-000000000001',
      name: 'Sarah Johnson',
      bio: 'Specializing in realistic portraits and nature scenes with 8+ years of experience',
      specialties: ['Realistic', 'Portraits', 'Nature'],
      experience_years: 8,
      hourly_rate: 150,
      booking_lead_time: 30,
      instagram: '@sarahink_tattoos',
      portfolio_images: [
        'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=400',
        'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400',
        'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400'
      ],
      verified: true,
      featured: true,
      studio_id: '10000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  bookings: [
    {
      id: '30000000-0000-0000-0000-000000000001',
      client_user_id: '00000000-0000-0000-0000-000000000003',
      artist_id: '20000000-0000-0000-0000-000000000001',
      studio_id: '10000000-0000-0000-0000-000000000001',
      appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration_hours: 3,
      status: 'confirmed',
      description: 'Small realistic rose tattoo on forearm',
      estimated_price: 450,
      deposit_amount: 150,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('artists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('studios').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Seed studios
    console.log('🏢 Seeding studios...')
    const { error: studiosError } = await supabase
      .from('studios')
      .insert(mockData.studios)
    
    if (studiosError) {
      console.error('Error seeding studios:', studiosError)
      throw studiosError
    }

    // Seed artists
    console.log('🎨 Seeding artists...')
    const { error: artistsError } = await supabase
      .from('artists')
      .insert(mockData.artists)
    
    if (artistsError) {
      console.error('Error seeding artists:', artistsError)
      throw artistsError
    }

    // Seed bookings
    console.log('📅 Seeding bookings...')
    const { error: bookingsError } = await supabase
      .from('bookings')
      .insert(mockData.bookings)
    
    if (bookingsError) {
      console.error('Error seeding bookings:', bookingsError)
      throw bookingsError
    }

    console.log('✅ Database seeding completed successfully!')
    
    // Display summary
    console.log('\n📊 Seeded data summary:')
    console.log(`- ${mockData.studios.length} studios`)
    console.log(`- ${mockData.artists.length} artists`) 
    console.log(`- ${mockData.bookings.length} bookings`)

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

async function resetDatabase() {
  console.log('🔄 Resetting database...')
  
  try {
    // Clear all data
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('artists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('studios').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('✅ Database reset completed!')
  } catch (error) {
    console.error('❌ Database reset failed:', error)
    process.exit(1)
  }
}

// Command line interface
const command = process.argv[2]

switch (command) {
  case 'seed':
    seedDatabase()
    break
  case 'reset':
    resetDatabase()
    break
  case 'fresh':
    resetDatabase().then(() => seedDatabase())
    break
  default:
    console.log('Usage: tsx scripts/seed.ts [seed|reset|fresh]')
    console.log('  seed  - Add mock data to database')
    console.log('  reset - Clear all data from database')
    console.log('  fresh - Reset and seed database')
    break
}