'use client'

import { useState, useEffect } from 'react'
import { Studio, StudioAvailability } from '@/lib/types'
import Button from './Button'
import BookingModal from './BookingModal'

interface StudioBookingCardProps {
  studio: Studio
  availability: StudioAvailability[]
  onBookingRequest: () => void
}

export default function StudioBookingCard({ studio, availability, onBookingRequest }: StudioBookingCardProps) {
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingHours, setBookingHours] = useState(studio.min_booking_hours || 2)

  const hasAvailability = availability.length > 0

  const handleBookingClick = () => {
    setShowBookingModal(true)
  }

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

      {/* Availability Summary */}
      {hasAvailability && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">Available Now</p>
              <p className="text-sm text-green-700">
                {availability.length} time slots in the next 30 days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Requirements */}
      <div className="mb-6 space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Minimum booking:</span>
          <span className="font-medium">{studio.min_booking_hours || 1} hours</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Maximum booking:</span>
          <span className="font-medium">{studio.max_booking_hours || 8} hours</span>
        </div>
      </div>

      {/* Booking Button */}
      <div className="space-y-3">
        {hasAvailability ? (
          <Button
            onClick={handleBookingClick}
            className="w-full"
            size="lg"
          >
            {studio.instant_book ? 'Book Instantly' : 'Request Booking'}
          </Button>
        ) : (
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
        
        {hasAvailability && (
          <div className="text-xs text-gray-500 text-center">
            {studio.instant_book 
              ? "You'll be charged immediately upon booking"
              : "You won't be charged until your request is approved"
            }
          </div>
        )}
      </div>

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

      {/* Booking Modal */}
      <BookingModal
        studio={studio}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onBookingSubmitted={() => {
          onBookingRequest()
          setShowBookingModal(false)
        }}
      />
    </div>
  )
}