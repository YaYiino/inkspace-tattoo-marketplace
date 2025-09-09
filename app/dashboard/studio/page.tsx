'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Studio, Profile, StudioFormData, StudioAvailability, AvailabilityFormData } from '@/lib/types'
import { Navigation } from '@/app/components/Navigation'
import Button from '@/app/components/Button'
import StudioListingForm from '@/app/components/StudioListingForm'
import AvailabilityCalendar from '@/app/components/AvailabilityCalendar'
import BookingsList from '@/app/components/BookingsList'
import BookingsCalendar from '@/app/components/BookingsCalendar'

export default function StudioDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [availability, setAvailability] = useState<StudioAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'bookings' | 'calendar' | 'edit-listing' | 'availability'>('dashboard')
  const [isSaving, setIsSaving] = useState(false)
  const [bookingStats, setBookingStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    totalRevenue: 0
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (studio) {
      loadBookingStats()
    }
  }, [studio])

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Load studio data
      const { data: studioData } = await supabase
        .from('studios')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      // If no profile or studio data, redirect to profile completion
      if (!profileData?.user_type || !studioData) {
        router.push('/profile-completion')
        return
      }

      setProfile(profileData)
      setStudio(studioData)
      
      // Load availability data
      if (studioData) {
        loadAvailability(studioData.id)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailability = async (studioId: string) => {
    try {
      const { data, error } = await supabase
        .from('studio_availability')
        .select('*')
        .eq('studio_id', studioId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error loading availability:', error)
      } else {
        setAvailability(data || [])
      }
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }

  const loadBookingStats = async () => {
    if (!studio) return

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('status, total_amount')
        .eq('studio_id', studio.id)

      if (error) {
        console.error('Error loading booking stats:', error)
        return
      }

      const stats = {
        total: bookings?.length || 0,
        pending: bookings?.filter(b => b.status === 'pending').length || 0,
        confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
        completed: bookings?.filter(b => b.status === 'completed').length || 0,
        totalRevenue: bookings?.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.total_amount), 0) || 0
      }

      setBookingStats(stats)
    } catch (error) {
      console.error('Error loading booking stats:', error)
    }
  }

  const handleSaveStudio = async (formData: Partial<StudioFormData>) => {
    if (!studio) return
    
    setIsSaving(true)
    try {
      const updateData: any = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        zip_code: formData.zip_code,
        hourly_rate: formData.hourly_rate,
        daily_rate: formData.daily_rate,
        amenities: formData.amenities,
        equipment: formData.equipment,
        policies: formData.policies,
        requirements: formData.requirements,
        instant_book: formData.instant_book,
        min_booking_hours: formData.min_booking_hours,
        max_booking_hours: formData.max_booking_hours,
        cancellation_policy: formData.cancellation_policy,
        updated_at: new Date().toISOString()
      }

      // Handle image uploads here if needed
      // For now, we'll skip image upload implementation

      const { error } = await supabase
        .from('studios')
        .update(updateData)
        .eq('id', studio.id)

      if (error) {
        console.error('Error updating studio:', error)
        throw error
      }

      // Reload studio data
      await loadProfile()
      setCurrentView('dashboard')
    } catch (error) {
      console.error('Error saving studio:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAvailability = async (availabilityData: AvailabilityFormData) => {
    if (!studio) return

    try {
      const { error } = await supabase
        .from('studio_availability')
        .insert({
          studio_id: studio.id,
          date: availabilityData.date,
          start_time: availabilityData.start_time,
          end_time: availabilityData.end_time,
          price_override: availabilityData.price_override,
          is_available: true
        })

      if (error) {
        console.error('Error saving availability:', error)
        throw error
      }

      // Reload availability
      loadAvailability(studio.id)
    } catch (error) {
      console.error('Error saving availability:', error)
      throw error
    }
  }

  const handleDeleteAvailability = async (availabilityId: string) => {
    try {
      const { error } = await supabase
        .from('studio_availability')
        .delete()
        .eq('id', availabilityId)

      if (error) {
        console.error('Error deleting availability:', error)
        throw error
      }

      // Update local state
      setAvailability(prev => prev.filter(av => av.id !== availabilityId))
    } catch (error) {
      console.error('Error deleting availability:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (currentView === 'edit-listing' && studio) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Studio Listing</h1>
          </div>
          <StudioListingForm
            studio={studio}
            onSave={handleSaveStudio}
            onCancel={() => setCurrentView('dashboard')}
            isLoading={isSaving}
          />
        </div>
      </div>
    )
  }

  if (currentView === 'availability' && studio) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Manage Availability</h1>
          </div>
          <AvailabilityCalendar
            studioId={studio.id}
            onSave={handleSaveAvailability}
            onDelete={handleDeleteAvailability}
            existingAvailability={availability}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {studio?.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Studio Dashboard - Manage your space and bookings
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                studio?.is_active 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {studio?.is_active ? '● Active Studio' : '● Inactive Studio'}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('edit-listing')}
                >
                  Edit Listing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('availability')}
                >
                  Manage Availability
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          {[
            { key: 'dashboard', label: 'Overview' },
            { key: 'bookings', label: 'Bookings' },
            { key: 'calendar', label: 'Calendar' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCurrentView(tab.key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{bookingStats.pending}</p>
                <p className="text-gray-600">Pending Requests</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{bookingStats.confirmed}</p>
                <p className="text-gray-600">Confirmed Bookings</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">${bookingStats.totalRevenue.toFixed(2)}</p>
                <p className="text-gray-600">Total Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{bookingStats.completed}</p>
                <p className="text-gray-600">Completed Sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Based on Current View */}
        {currentView === 'dashboard' && (
          <>
            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Booking Requests</h2>
                <button
                  onClick={() => setCurrentView('bookings')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {profile && (
                <BookingsList 
                  userType="studio" 
                  userId={profile.id} 
                  onBookingUpdate={loadBookingStats}
                />
              )}
            </div>

            {/* Studio Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Studio Information</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('edit-listing')}
            >
              Edit Details
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 text-sm">{studio?.description || 'No description provided'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600 text-sm">
                {studio?.address}<br />
                {studio?.city}, {studio?.state} {studio?.zip_code}
                {studio?.country && studio.country !== 'United States' && (
                  <><br />{studio.country}</>
                )}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Pricing</h3>
              <p className="text-gray-600 text-sm">
                ${studio?.hourly_rate}/hour • ${studio?.daily_rate}/day
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Cancellation Policy</h3>
              <p className="text-gray-600 text-sm">
                {studio?.cancellation_policy || 'No policy set'}
              </p>
            </div>
          </div>
        </div>

        {/* Amenities & Equipment */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Amenities */}
          {studio?.amenities && studio.amenities.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Studio Amenities</h2>
              <div className="grid grid-cols-1 gap-2">
                {studio.amenities.map((amenity, index) => (
                  <div 
                    key={index}
                    className="flex items-center p-2 bg-green-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {studio?.equipment && studio.equipment.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Equipment</h2>
              <div className="grid grid-cols-1 gap-2">
                {studio.equipment.map((equipment, index) => (
                  <div 
                    key={index}
                    className="flex items-center p-2 bg-blue-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">{equipment}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

            {/* Studio Images */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Studio Photos</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('edit-listing')}
                >
                  Manage Photos
                </Button>
              </div>
              {studio?.images && studio.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {studio.images.slice(0, 8).map((image, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={image} 
                        alt={`Studio ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Yet</h3>
                  <p className="text-gray-600 mb-4">Add photos to showcase your studio and attract more artists</p>
                  <Button onClick={() => setCurrentView('edit-listing')}>Add Photos</Button>
                </div>
              )}
            </div>
          </>
        )}

        {currentView === 'bookings' && profile && (
          <BookingsList 
            userType="studio" 
            userId={profile.id} 
            onBookingUpdate={loadBookingStats}
          />
        )}

        {currentView === 'calendar' && profile && (
          <BookingsCalendar 
            userType="studio" 
            userId={profile.id}
          />
        )}
      </div>
    </div>
  )
}