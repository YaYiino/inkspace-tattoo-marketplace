'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Studio, StudioAvailability } from '@/lib/types'
import { Navigation } from '@/app/components/Navigation'
import Button from '@/app/components/Button'
import ImageGallery from '@/app/components/ImageGallery'
import StudioBookingCard from '@/app/components/StudioBookingCard'
import { generateStructuredData } from '@/lib/seo'
import Head from 'next/head'

export default function StudioDetailPage() {
  const [studio, setStudio] = useState<Studio | null>(null)
  const [availability, setAvailability] = useState<StudioAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      loadStudio(params.id as string)
    }
  }, [params.id])

  const loadStudio = async (studioId: string) => {
    try {
      // Load studio details
      const { data: studioData, error: studioError } = await supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .eq('is_active', true)
        .single()

      if (studioError) {
        console.error('Error loading studio:', studioError)
        router.push('/studios')
        return
      }

      setStudio(studioData)

      // Load availability for the next 30 days
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('studio_availability')
        .select('*')
        .eq('studio_id', studioId)
        .eq('is_available', true)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (!availabilityError) {
        setAvailability(availabilityData || [])
      }
    } catch (error) {
      console.error('Error loading studio:', error)
      router.push('/studios')
    } finally {
      setLoading(false)
    }
  }

  const formatLocation = () => {
    if (!studio) return ''
    const parts = [studio.address, studio.city, studio.state, studio.zip_code, studio.country]
      .filter(Boolean)
    return parts.join(', ')
  }

  const handleBookingRequest = () => {
    // This would open the booking modal or navigate to booking page
    setShowBooking(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded mb-8"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-40 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Studio Not Found</h1>
            <p className="text-gray-600 mb-8">This studio might have been removed or is no longer available.</p>
            <Button onClick={() => router.push('/studios')}>
              Back to Studios
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {studio && (
        <Head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateStructuredData(studio))
            }}
          />
        </Head>
      )}
      <Navigation />
      
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => router.push('/studios')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Studios
          </button>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">{studio.name}</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{studio.name}</h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{formatLocation()}</span>
                </div>
                {studio.instant_book && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 text-sm font-medium rounded-full">
                    Instant Book
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">${studio.hourly_rate}</div>
              <div className="text-sm text-gray-600">per hour</div>
              {studio.daily_rate && (
                <div className="text-sm text-gray-600 mt-1">
                  ${studio.daily_rate}/day
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="mb-8">
          <ImageGallery images={studio.images || []} studioName={studio.name} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Studio</h2>
              <p className="text-gray-700 leading-relaxed">
                {studio.description || 'No description available for this studio.'}
              </p>
            </div>

            {/* Amenities */}
            {studio.amenities && studio.amenities.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 gap-3">
                  {studio.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {studio.equipment && studio.equipment.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Equipment</h2>
                <div className="grid grid-cols-2 gap-3">
                  {studio.equipment.map((equipment, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">{equipment}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policies */}
            {(studio.policies || studio.requirements || studio.cancellation_policy) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Policies & Requirements</h2>
                <div className="space-y-4">
                  {studio.policies && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Studio Policies</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{studio.policies}</p>
                    </div>
                  )}
                  {studio.requirements && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Artist Requirements</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{studio.requirements}</p>
                    </div>
                  )}
                  {studio.cancellation_policy && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Cancellation Policy</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{studio.cancellation_policy}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Map Placeholder */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="font-medium">Map View</p>
                  <p className="text-sm">{formatLocation()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:sticky lg:top-8">
            <StudioBookingCard
              studio={studio}
              availability={availability}
              onBookingRequest={handleBookingRequest}
            />
          </div>
        </div>
      </div>
    </div>
  )
}