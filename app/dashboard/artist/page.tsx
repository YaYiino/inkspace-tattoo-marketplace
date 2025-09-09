'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Artist, Profile, Booking } from '@/lib/types'
import { Navigation } from '@/app/components/Navigation'
import BookingsList from '@/app/components/BookingsList'
import BookingsCalendar from '@/app/components/BookingsCalendar'

export default function ArtistDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'overview' | 'bookings' | 'calendar'>('overview')
  const [bookingStats, setBookingStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    totalEarnings: 0
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (artist) {
      loadBookingStats()
    }
  }, [artist])

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

      // Load artist data
      const { data: artistData } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      // If no profile or artist data, redirect to profile completion
      if (!profileData?.user_type || !artistData) {
        router.push('/profile-completion')
        return
      }

      setProfile(profileData)
      setArtist(artistData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookingStats = async () => {
    if (!artist) return

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('status, total_amount')
        .eq('artist_id', artist.id)

      if (error) {
        console.error('Error loading booking stats:', error)
        return
      }

      const stats = {
        total: bookings?.length || 0,
        pending: bookings?.filter(b => b.status === 'pending').length || 0,
        confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
        completed: bookings?.filter(b => b.status === 'completed').length || 0,
        totalEarnings: bookings?.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.total_amount), 0) || 0
      }

      setBookingStats(stats)
    } catch (error) {
      console.error('Error loading booking stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                Welcome back, {profile?.full_name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Artist Dashboard - Manage your profile and bookings
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                artist?.is_verified 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {artist?.is_verified ? '✓ Verified Artist' : 'Pending Verification'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          {[
            { key: 'overview', label: 'Overview' },
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
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{bookingStats.confirmed}</p>
                <p className="text-gray-600">Upcoming Bookings</p>
              </div>
            </div>
          </div>

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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">${bookingStats.totalEarnings.toFixed(2)}</p>
                <p className="text-gray-600">Total Earnings</p>
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
        {currentView === 'overview' && (
          <>
            {/* Profile Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Bio</h3>
                  <p className="text-gray-600 text-sm">{artist?.bio || 'No bio added yet'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {artist?.specialties?.map((specialty, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    )) || <span className="text-gray-500 text-sm">No specialties added</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
                <button
                  onClick={() => setCurrentView('bookings')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {profile && (
                <BookingsList 
                  userType="artist" 
                  userId={profile.id} 
                  onBookingUpdate={loadBookingStats}
                />
              )}
            </div>

            {/* Portfolio Images */}
            {artist?.portfolio_images && artist.portfolio_images.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {artist.portfolio_images.slice(0, 8).map((image, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={image} 
                        alt={`Portfolio ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                {artist.portfolio_images.length > 8 && (
                  <div className="text-center mt-4">
                    <span className="text-gray-500 text-sm">
                      +{artist.portfolio_images.length - 8} more images
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {currentView === 'bookings' && profile && (
          <BookingsList 
            userType="artist" 
            userId={profile.id} 
            onBookingUpdate={loadBookingStats}
          />
        )}

        {currentView === 'calendar' && profile && (
          <BookingsCalendar 
            userType="artist" 
            userId={profile.id}
          />
        )}
      </div>
    </div>
  )
}