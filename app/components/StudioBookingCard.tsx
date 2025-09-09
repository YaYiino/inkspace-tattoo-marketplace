'use client'

import { useState, useEffect } from 'react'
import { Studio, StudioAvailability } from '@/lib/types'
import Button from './Button'

interface StudioBookingCardProps {
  studio: Studio
  availability: StudioAvailability[]
  onBookingRequest: () => void
}

export default function StudioBookingCard({ studio, availability, onBookingRequest }: StudioBookingCardProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<StudioAvailability | null>(null)
  const [bookingHours, setBookingHours] = useState(studio.min_booking_hours || 2)
  const [totalPrice, setTotalPrice] = useState(0)

  // Get available dates for the next 30 days
  const getAvailableDates = () => {
    const dates = new Set(availability.map(slot => slot.date))
    return Array.from(dates).sort().slice(0, 10) // Show up to 10 available dates
  }

  // Get time slots for selected date
  const getTimeSlotsForDate = (date: string) => {
    return availability.filter(slot => slot.date === date)
  }

  // Calculate total price
  useEffect(() => {
    if (selectedTimeSlot && bookingHours) {
      const hourlyRate = selectedTimeSlot.price_override || studio.hourly_rate || 0
      setTotalPrice(hourlyRate * bookingHours)
    }
  }, [selectedTimeSlot, bookingHours, studio.hourly_rate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    })
  }

  const availableDates = getAvailableDates()
  const timeSlotsForDate = selectedDate ? getTimeSlotsForDate(selectedDate) : []

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-2xl font-bold text-gray-900">
            ${studio.hourly_rate}
          </div>
          <div className="text-sm text-gray-600">per hour</div>
        </div>
        {studio.daily_rate && (
          <div className="text-sm text-gray-600">
            ${studio.daily_rate}/day available
          </div>
        )}
        {studio.instant_book && (
          <div className="flex items-center mt-2">
            <svg className="w-4 h-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm text-green-600 font-medium">Instant booking available</span>
          </div>
        )}
      </div>

      {/* Booking Hours */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Session Length
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={studio.min_booking_hours || 1}
            max={studio.max_booking_hours || 8}
            value={bookingHours}
            onChange={(e) => setBookingHours(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12">
            {bookingHours}h
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{studio.min_booking_hours || 1}h min</span>
          <span>{studio.max_booking_hours || 8}h max</span>
        </div>
      </div>

      {/* Date Selection */}
      {availableDates.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Available Dates
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableDates.map((date) => (
              <button
                key={date}
                onClick={() => {
                  setSelectedDate(date)
                  setSelectedTimeSlot(null)
                }}
                className={`w-full text-left px-3 py-2 border rounded-md transition-colors ${
                  selectedDate === date
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">{formatDate(date)}</div>
                <div className="text-sm text-gray-500">
                  {getTimeSlotsForDate(date).length} time slots available
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time Slot Selection */}
      {selectedDate && timeSlotsForDate.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Available Times for {formatDate(selectedDate)}
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {timeSlotsForDate.map((slot, index) => (
              <button
                key={index}
                onClick={() => setSelectedTimeSlot(slot)}
                className={`w-full text-left px-3 py-2 border rounded-md transition-colors ${
                  selectedTimeSlot === slot
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </span>
                  {slot.price_override && (
                    <span className="text-sm text-green-600">
                      ${slot.price_override}/hr
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      {selectedTimeSlot && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Booking Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{formatTime(selectedTimeSlot.start_time)}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{bookingHours} hours</span>
            </div>
            <div className="flex justify-between">
              <span>Rate:</span>
              <span>${selectedTimeSlot.price_override || studio.hourly_rate}/hour</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${totalPrice}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Button */}
      <div className="space-y-3">
        {selectedTimeSlot ? (
          <Button
            onClick={onBookingRequest}
            className="w-full"
            size="lg"
          >
            {studio.instant_book ? 'Book Instantly' : 'Request Booking'}
          </Button>
        ) : (
          <Button
            disabled
            className="w-full"
            size="lg"
          >
            Select Date & Time
          </Button>
        )}
        
        <div className="text-xs text-gray-500 text-center">
          {studio.instant_book 
            ? "You'll be charged immediately upon booking"
            : "You won't be charged until your request is approved"
          }
        </div>
      </div>

      {/* No Availability Message */}
      {availableDates.length === 0 && (
        <div className="text-center py-6">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h4 className="font-medium text-gray-900 mb-1">No Availability</h4>
          <p className="text-sm text-gray-600 mb-4">
            This studio doesn't have any available time slots in the next 30 days.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // This could open a contact form or send to a different booking flow
              alert('Feature coming soon: Contact studio directly for availability')
            }}
          >
            Contact Studio
          </Button>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 text-sm text-gray-600">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Free cancellation up to 24 hours before</span>
        </div>
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Secure payment processing</span>
        </div>
        {studio.cancellation_policy && (
          <div className="text-xs">
            <strong>Cancellation:</strong> {studio.cancellation_policy}
          </div>
        )}
      </div>
    </div>
  )
}