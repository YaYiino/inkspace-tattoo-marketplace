'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Booking } from '@/lib/types'

interface BookingsCalendarProps {
  userType: 'artist' | 'studio'
  userId: string
  onDateSelect?: (date: string) => void
}

export default function BookingsCalendar({ userType, userId, onDateSelect }: BookingsCalendarProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    loadBookings()
  }, [userType, userId, currentDate])

  const loadBookings = async () => {
    setLoading(true)
    try {
      // Get start and end of current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)

      let query = supabase
        .from('bookings')
        .select(`
          *,
          studio:studios(name),
          artist:artists(*, profiles:user_id(full_name))
        `)
        .gte('start_datetime', startOfMonth.toISOString())
        .lte('start_datetime', endOfMonth.toISOString())
        .in('status', ['confirmed', 'pending'])
        .order('start_datetime', { ascending: true })

      // Filter by user type
      if (userType === 'artist') {
        const { data: artistData } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        if (artistData) {
          query = query.eq('artist_id', artistData.id)
        }
      } else {
        const { data: studioData } = await supabase
          .from('studios')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        if (studioData) {
          query = query.eq('studio_id', studioData.id)
        }
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

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getBookingsForDate = (day: number) => {
    if (!day) return []
    
    const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_datetime).toDateString()
      return bookingDate === dateString
    })
  }

  const handleDateClick = (day: number) => {
    if (!day) return
    
    const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0]
    setSelectedDate(dateString)
    onDateSelect?.(dateString)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const days = getDaysInMonth()
  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {userType === 'artist' ? 'My Bookings' : 'Studio Bookings'}
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-lg font-medium text-gray-900 min-w-[140px] text-center">
            {monthYear}
          </h4>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {loading ? (
          // Loading skeleton
          Array.from({ length: 42 }, (_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse m-1" />
          ))
        ) : (
          days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-20" />
            }

            const dayBookings = getBookingsForDate(day)
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
            const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0]
            const isSelected = selectedDate === dateString

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`h-20 p-1 rounded border transition-colors text-left relative ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isToday
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`text-sm font-medium ${
                  isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day}
                </div>
                
                {/* Booking indicators */}
                <div className="mt-1 space-y-1">
                  {dayBookings.slice(0, 2).map((booking, bookingIndex) => (
                    <div
                      key={booking.id}
                      className={`text-xs px-1 py-0.5 rounded truncate ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                      title={`${userType === 'artist' ? booking.studio?.name : booking.artist?.profiles?.full_name} - ${
                        new Date(booking.start_datetime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true
                        })
                      }`}
                    >
                      {new Date(booking.start_datetime).toLocaleTimeString('en-US', { 
                        hour: 'numeric',
                        hour12: true
                      })}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
          <span className="text-gray-600">Confirmed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-100 rounded mr-2"></div>
          <span className="text-gray-600">Pending</span>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">
            Bookings for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h4>
          {(() => {
            const dayBookings = getBookingsForDate(new Date(selectedDate + 'T00:00:00').getDate())
            return dayBookings.length === 0 ? (
              <p className="text-gray-500 text-sm">No bookings for this day</p>
            ) : (
              <div className="space-y-2">
                {dayBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {userType === 'artist' ? booking.studio?.name : booking.artist?.profiles?.full_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(booking.start_datetime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true
                        })} - {new Date(booking.end_datetime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}