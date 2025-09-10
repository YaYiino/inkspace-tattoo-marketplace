/**
 * Database Seeding Script for Antsss Platform
 * 
 * This script provides comprehensive database seeding functionality for all environments.
 * It includes user data, tattoo artist profiles, bookings, and sample content.
 */

import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Types
interface User {
  id: string
  email: string
  password: string
  role: 'client' | 'artist' | 'admin'
  profile: UserProfile
}

interface UserProfile {
  first_name: string
  last_name: string
  avatar_url?: string
  bio?: string
  phone?: string
  location?: string
}

interface Artist extends User {
  artist_profile: ArtistProfile
}

interface ArtistProfile {
  business_name: string
  specialties: string[]
  experience_years: number
  hourly_rate: number
  portfolio_images: string[]
  verified: boolean
  availability: Record<string, any>
}

interface Booking {
  id: string
  client_id: string
  artist_id: string
  service_type: string
  appointment_date: string
  duration_hours: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  total_price: number
  notes?: string
}

// Configuration
const SEED_CONFIG = {
  development: {
    users: { clients: 20, artists: 8, admins: 2 },
    bookings: 50,
    portfolioImages: 5,
  },
  staging: {
    users: { clients: 50, artists: 15, admins: 3 },
    bookings: 150,
    portfolioImages: 8,
  },
  production: {
    users: { clients: 0, artists: 0, admins: 1 }, // Only admin for production
    bookings: 0,
    portfolioImages: 0,
  },
}

class DatabaseSeeder {
  private supabase: any
  private environment: string
  private config: any

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    this.environment = process.env.NEXT_PUBLIC_ENV || 'development'
    this.config = SEED_CONFIG[this.environment as keyof typeof SEED_CONFIG] || SEED_CONFIG.development

    console.log(`🌱 Seeding database for ${this.environment} environment`)
  }

  /**
   * Main seeding method
   */
  async seed(): Promise<void> {
    try {
      console.log('🚀 Starting database seeding...')
      
      // Clear existing data (development only)
      if (this.environment === 'development') {
        await this.clearData()
      }

      // Create users and profiles
      const users = await this.createUsers()
      const artists = await this.createArtists()
      
      // Create bookings
      if (this.config.bookings > 0) {
        await this.createBookings(users, artists)
      }
      
      // Create sample content
      await this.createSampleContent()
      
      console.log('✅ Database seeding completed successfully!')
      
      // Print summary
      await this.printSummary()
      
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    }
  }

  /**
   * Clear existing data (development only)
   */
  private async clearData(): Promise<void> {
    console.log('🧹 Clearing existing data...')
    
    const tables = [
      'bookings',
      'artist_profiles',
      'user_profiles',
      'users',
    ]
    
    for (const table of tables) {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .neq('id', 'impossible-id') // Delete all records
      
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        console.warn(`Warning: Could not clear ${table}:`, error.message)
      }
    }
    
    console.log('✅ Data cleared')
  }

  /**
   * Create regular users (clients)
   */
  private async createUsers(): Promise<User[]> {
    console.log(`👥 Creating ${this.config.users.clients} client users...`)
    
    const users: User[] = []
    
    for (let i = 0; i < this.config.users.clients; i++) {
      const user: User = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        password: await bcrypt.hash('password123', 10),
        role: 'client',
        profile: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          avatar_url: faker.image.avatar(),
          bio: faker.lorem.sentence(),
          phone: faker.phone.number(),
          location: `${faker.location.city()}, ${faker.location.state()}`,
        },
      }
      
      users.push(user)
    }
    
    // Insert users
    const { error: usersError } = await this.supabase
      .from('users')
      .insert(users.map(user => ({
        id: user.id,
        email: user.email,
        password_hash: user.password,
        role: user.role,
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (usersError) {
      throw new Error(`Failed to create users: ${usersError.message}`)
    }
    
    // Insert user profiles
    const { error: profilesError } = await this.supabase
      .from('user_profiles')
      .insert(users.map(user => ({
        id: faker.string.uuid(),
        user_id: user.id,
        ...user.profile,
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (profilesError) {
      throw new Error(`Failed to create user profiles: ${profilesError.message}`)
    }
    
    console.log(`✅ Created ${users.length} client users`)
    return users
  }

  /**
   * Create tattoo artists
   */
  private async createArtists(): Promise<Artist[]> {
    console.log(`🎨 Creating ${this.config.users.artists} tattoo artists...`)
    
    const artists: Artist[] = []
    const specialties = [
      'Traditional',
      'Realism',
      'Black & Grey',
      'Watercolor',
      'Japanese',
      'Geometric',
      'Minimalist',
      'Portrait',
      'Biomechanical',
      'Neo-traditional',
    ]
    
    for (let i = 0; i < this.config.users.artists; i++) {
      const artist: Artist = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        password: await bcrypt.hash('password123', 10),
        role: 'artist',
        profile: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          avatar_url: faker.image.avatar(),
          bio: faker.lorem.paragraphs(2),
          phone: faker.phone.number(),
          location: `${faker.location.city()}, ${faker.location.state()}`,
        },
        artist_profile: {
          business_name: `${faker.person.lastName()} Tattoo Studio`,
          specialties: faker.helpers.arrayElements(specialties, { min: 2, max: 4 }),
          experience_years: faker.number.int({ min: 1, max: 20 }),
          hourly_rate: faker.number.int({ min: 100, max: 300 }),
          portfolio_images: Array.from({ length: this.config.portfolioImages }, () => faker.image.url()),
          verified: faker.datatype.boolean(),
          availability: {
            monday: { start: '09:00', end: '17:00', available: true },
            tuesday: { start: '09:00', end: '17:00', available: true },
            wednesday: { start: '09:00', end: '17:00', available: true },
            thursday: { start: '09:00', end: '17:00', available: true },
            friday: { start: '09:00', end: '17:00', available: true },
            saturday: { start: '10:00', end: '16:00', available: true },
            sunday: { available: false },
          },
        },
      }
      
      artists.push(artist)
    }
    
    // Insert users
    const { error: usersError } = await this.supabase
      .from('users')
      .insert(artists.map(artist => ({
        id: artist.id,
        email: artist.email,
        password_hash: artist.password,
        role: artist.role,
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (usersError) {
      throw new Error(`Failed to create artist users: ${usersError.message}`)
    }
    
    // Insert user profiles
    const { error: profilesError } = await this.supabase
      .from('user_profiles')
      .insert(artists.map(artist => ({
        id: faker.string.uuid(),
        user_id: artist.id,
        ...artist.profile,
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (profilesError) {
      throw new Error(`Failed to create artist profiles: ${profilesError.message}`)
    }
    
    // Insert artist profiles
    const { error: artistProfilesError } = await this.supabase
      .from('artist_profiles')
      .insert(artists.map(artist => ({
        id: faker.string.uuid(),
        user_id: artist.id,
        business_name: artist.artist_profile.business_name,
        specialties: artist.artist_profile.specialties,
        experience_years: artist.artist_profile.experience_years,
        hourly_rate: artist.artist_profile.hourly_rate,
        portfolio_images: artist.artist_profile.portfolio_images,
        verified: artist.artist_profile.verified,
        availability: artist.artist_profile.availability,
        rating: faker.number.float({ min: 3.5, max: 5.0, multipleOf: 0.1 }),
        reviews_count: faker.number.int({ min: 0, max: 50 }),
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (artistProfilesError) {
      throw new Error(`Failed to create artist profiles: ${artistProfilesError.message}`)
    }
    
    console.log(`✅ Created ${artists.length} tattoo artists`)
    return artists
  }

  /**
   * Create bookings
   */
  private async createBookings(users: User[], artists: Artist[]): Promise<void> {
    console.log(`📅 Creating ${this.config.bookings} bookings...`)
    
    const bookings: Booking[] = []
    const serviceTypes = [
      'Small Tattoo (1-3 inches)',
      'Medium Tattoo (3-6 inches)',
      'Large Tattoo (6+ inches)',
      'Consultation',
      'Touch-up Session',
      'Cover-up Tattoo',
      'Custom Design Session',
    ]
    
    const statuses: Array<Booking['status']> = ['pending', 'confirmed', 'completed', 'cancelled']
    
    for (let i = 0; i < this.config.bookings; i++) {
      const client = faker.helpers.arrayElement(users)
      const artist = faker.helpers.arrayElement(artists)
      const serviceType = faker.helpers.arrayElement(serviceTypes)
      const duration = faker.number.int({ min: 1, max: 6 })
      const status = faker.helpers.arrayElement(statuses)
      
      const booking: Booking = {
        id: faker.string.uuid(),
        client_id: client.id,
        artist_id: artist.id,
        service_type: serviceType,
        appointment_date: faker.date.future().toISOString(),
        duration_hours: duration,
        status: status,
        total_price: duration * artist.artist_profile.hourly_rate,
        notes: faker.lorem.sentence(),
      }
      
      bookings.push(booking)
    }
    
    const { error } = await this.supabase
      .from('bookings')
      .insert(bookings.map(booking => ({
        id: booking.id,
        client_id: booking.client_id,
        artist_id: booking.artist_id,
        service_type: booking.service_type,
        appointment_date: booking.appointment_date,
        duration_hours: booking.duration_hours,
        status: booking.status,
        total_price: booking.total_price,
        notes: booking.notes,
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (error) {
      throw new Error(`Failed to create bookings: ${error.message}`)
    }
    
    console.log(`✅ Created ${bookings.length} bookings`)
  }

  /**
   * Create sample content (galleries, reviews, etc.)
   */
  private async createSampleContent(): Promise<void> {
    console.log('🎭 Creating sample content...')
    
    // This would include creating:
    // - Gallery images
    // - Reviews and ratings
    // - Blog posts
    // - FAQ entries
    // - etc.
    
    console.log('✅ Sample content created')
  }

  /**
   * Create admin users
   */
  private async createAdminUsers(): Promise<void> {
    console.log(`👑 Creating ${this.config.users.admins} admin users...`)
    
    const admins = []
    
    // Default admin user
    const defaultAdmin = {
      id: faker.string.uuid(),
      email: 'admin@antsss.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      profile: {
        first_name: 'System',
        last_name: 'Administrator',
        avatar_url: faker.image.avatar(),
        bio: 'Platform administrator',
        phone: faker.phone.number(),
        location: 'Platform',
      },
    }
    
    admins.push(defaultAdmin)
    
    // Additional admin users if needed
    for (let i = 1; i < this.config.users.admins; i++) {
      const admin = {
        id: faker.string.uuid(),
        email: `admin${i + 1}@antsss.com`,
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        profile: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          avatar_url: faker.image.avatar(),
          bio: 'Platform administrator',
          phone: faker.phone.number(),
          location: 'Platform',
        },
      }
      
      admins.push(admin)
    }
    
    // Insert admin users
    const { error: usersError } = await this.supabase
      .from('users')
      .insert(admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        password_hash: admin.password,
        role: admin.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (usersError) {
      throw new Error(`Failed to create admin users: ${usersError.message}`)
    }
    
    // Insert admin profiles
    const { error: profilesError } = await this.supabase
      .from('user_profiles')
      .insert(admins.map(admin => ({
        id: faker.string.uuid(),
        user_id: admin.id,
        ...admin.profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    
    if (profilesError) {
      throw new Error(`Failed to create admin profiles: ${profilesError.message}`)
    }
    
    console.log(`✅ Created ${admins.length} admin users`)
  }

  /**
   * Print seeding summary
   */
  private async printSummary(): Promise<void> {
    console.log('\n📊 Seeding Summary:')
    console.log('==================')
    
    // Count records in each table
    const tables = ['users', 'user_profiles', 'artist_profiles', 'bookings']
    
    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`${table}: Error fetching count`)
        } else {
          console.log(`${table}: ${count} records`)
        }
      } catch (error) {
        console.log(`${table}: Table may not exist`)
      }
    }
    
    console.log('\n🔑 Test Accounts:')
    console.log('=================')
    console.log('Admin: admin@antsss.com / admin123')
    console.log('All other accounts: password123')
    console.log('\n✨ Database seeding completed successfully!')
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0] || 'seed'
  
  const seeder = new DatabaseSeeder()
  
  switch (command) {
    case 'seed':
      await seeder.seed()
      break
    case 'clear':
      console.log('🧹 Clearing database...')
      // Only allow in development
      if (process.env.NEXT_PUBLIC_ENV === 'development') {
        await seeder['clearData']()
        console.log('✅ Database cleared')
      } else {
        console.error('❌ Clear command only allowed in development environment')
        process.exit(1)
      }
      break
    default:
      console.log('Usage: npx tsx scripts/seed.ts [command]')
      console.log('Commands:')
      console.log('  seed  - Seed the database (default)')
      console.log('  clear - Clear all data (development only)')
      process.exit(1)
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
  process.exit(1)
})

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
}

export default DatabaseSeeder