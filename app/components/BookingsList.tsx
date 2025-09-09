'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Booking, Studio, Artist, Profile } from '@/lib/types'
import Button from './Button'
import BookingMessages from './BookingMessages'

interface BookingsListProps {
  userType: 'artist' | 'studio'
  userId: string
  onBookingUpdate?: () => void
}

export default function BookingsList({ userType, userId, onBookingUpdate }: BookingsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedBookingForMessages, setSelectedBookingForMessages] = useState<Booking | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadBookings()
  }, [userType, userId, filter])

  const loadBookings = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          studio:studios(*),
          artist:artists(*, profiles:user_id(*))
        `)
        .order('created_at', { ascending: false })

      // Filter by user type
      if (userType === 'artist') {
        // Get artist record first to get artist_id
        const { data: artistData } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        if (artistData) {
          query = query.eq('artist_id', artistData.id)
        }
      } else {
        // For studio owners
        const { data: studioData } = await supabase
          .from('studios')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        if (studioData) {
          query = query.eq('studio_id', studioData.id)
        }
      }

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading bookings:', error)
        return
      }

      setBookings(data || [])
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel', reason?: string) => {
    setActionLoading(bookingId)
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (action === 'confirm') {
        updateData.status = 'confirmed'
        updateData.confirmed_at = new Date().toISOString()
      } else {
        updateData.status = 'cancelled'
        updateData.cancelled_at = new Date().toISOString()
        updateData.cancelled_by = userId
        if (reason) {
          updateData.cancellation_reason = reason
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        console.error(`Error ${action}ing booking:`, error)
        return
      }

      // Reload bookings
      await loadBookings()
      onBookingUpdate?.()

    } catch (error) {
      console.error(`Error ${action}ing booking:`, error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getBookingTimeStatus = (startDateTime: string, status: string) => {
    const now = new Date()
    const startTime = new Date(startDateTime)
    
    if (status === 'cancelled' || status === 'completed') {
      return null
    }
    
    if (startTime < now) {
      return 'overdue'
    } else if (startTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return 'soon'
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? `No ${userType === 'artist' ? 'bookings' : 'booking requests'} yet`
              : `No ${filter} bookings`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const startDateTime = formatDateTime(booking.start_datetime)
            const endDateTime = formatDateTime(booking.end_datetime)
            const timeStatus = getBookingTimeStatus(booking.start_datetime, booking.status)
            
            return (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {userType === 'artist' ? booking.studio?.name : booking.artist?.profiles?.full_name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      {timeStatus && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          timeStatus === 'soon' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {timeStatus === 'soon' ? 'Starting Soon' : 'Overdue'}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">Date & Time</p>
                        <p>{startDateTime.date}</p>
                        <p>{startDateTime.time} - {endDateTime.time}</p>
                      </div>
                      <div>
                        <p className="font-medium">Duration & Cost</p>
                        <p>{booking.total_hours} hours</p>
                        <p className="text-lg font-semibold text-gray-900">${booking.total_amount.toFixed(2)}</p>
                      </div>
                    </div>

                    {booking.booking_notes && (
                      <div className="mt-4">
                        <p className="font-medium text-sm text-gray-700">Notes:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 mt-1">{booking.booking_notes}</p>
                      </div>
                    )}

                    {booking.artist_requirements && (
                      <div className="mt-4">
                        <p className="font-medium text-sm text-gray-700">Requirements:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 mt-1">{booking.artist_requirements}</p>
                      </div>
                    )}

                    {booking.cancellation_reason && (
                      <div className="mt-4">
                        <p className="font-medium text-sm text-red-700">Cancellation Reason:</p>
                        <p className="text-sm text-red-600 bg-red-50 rounded p-2 mt-1">{booking.cancellation_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Requested {new Date(booking.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {booking.status === 'pending' && userType === 'studio' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBookingAction(booking.id, 'cancel', 'Declined by studio')}
                          loading={actionLoading === booking.id}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBookingAction(booking.id, 'confirm')}
                          loading={actionLoading === booking.id}
                        >
                          Confirm
                        </Button>
                      </>
                    )}

                    {booking.status === 'pending' && userType === 'artist' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBookingAction(booking.id, 'cancel', 'Cancelled by artist')}
                        loading={actionLoading === booking.id}
                      >
                        Cancel Request
                      </Button>
                    )}

                    {(booking.status === 'confirmed' || booking.status === 'pending') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBookingForMessages(booking)}
                      >
                        Message
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Messaging Modal */}
      {selectedBookingForMessages && (
        <BookingMessages
          booking={selectedBookingForMessages}
          currentUserId={userId}
          onClose={() => setSelectedBookingForMessages(null)}
        />
      )}
    </div>
  )
}