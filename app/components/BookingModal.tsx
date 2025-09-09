'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Studio, Artist, BookingFormData } from '@/lib/types'
import Button from './Button'

interface BookingModalProps {
  studio: Studio
  isOpen: boolean
  onClose: () => void
  onBookingSubmitted: () => void
}

export default function BookingModal({ studio, isOpen, onClose, onBookingSubmitted }: BookingModalProps) {
  const [step, setStep] = useState<'datetime' | 'details' | 'confirmation'>('datetime')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userArtist, setUserArtist] = useState<Artist | null>(null)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStartTime, setSelectedStartTime] = useState('')
  const [selectedEndTime, setSelectedEndTime] = useState('')
  const [duration, setDuration] = useState<number>(0)
  const [totalCost, setTotalCost] = useState<number>(0)
  const [bookingNotes, setBookingNotes] = useState('')
  const [artistRequirements, setArtistRequirements] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadUserProfile()
      loadAvailableSlots()
      setStep('datetime')
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedStartTime && selectedEndTime) {
      calculateDurationAndCost()
    }
  }, [selectedStartTime, selectedEndTime, studio.hourly_rate])

  const loadUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to make a booking')
        return
      }

      setCurrentUser(session.user)

      // Get artist profile
      const { data: artistData, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (artistError) {
        setError('You must be registered as an artist to make bookings')
        return
      }

      setUserArtist(artistData)
    } catch (error) {
      console.error('Error loading user profile:', error)
      setError('Error loading your profile')
    }
  }

  const loadAvailableSlots = async () => {
    try {
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('studio_availability')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_available', true)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading available slots:', error)
        return
      }

      setAvailableSlots(data || [])
    } catch (error) {
      console.error('Error loading available slots:', error)
    }
  }

  const calculateDurationAndCost = () => {
    if (!selectedStartTime || !selectedEndTime) return

    const start = new Date(`2000-01-01T${selectedStartTime}:00`)
    const end = new Date(`2000-01-01T${selectedEndTime}:00`)
    
    if (end <= start) {
      setError('End time must be after start time')
      return
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const cost = durationHours * (studio.hourly_rate || 0)
    
    setDuration(durationHours)
    setTotalCost(cost)
    setError(null)
  }

  const handleSubmitBooking = async () => {
    if (!userArtist || !selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const startDateTime = `${selectedDate}T${selectedStartTime}:00`
      const endDateTime = `${selectedDate}T${selectedEndTime}:00`

      // Check for conflicts
      const { data: conflictCheck, error: conflictError } = await supabase
        .rpc('check_booking_conflict', {
          p_studio_id: studio.id,
          p_start_datetime: startDateTime,
          p_end_datetime: endDateTime
        })

      if (conflictError) {
        console.error('Error checking conflicts:', conflictError)
        setError('Error checking availability')
        return
      }

      if (conflictCheck) {
        setError('This time slot is no longer available')
        return
      }

      // Create the booking
      const bookingData = {
        studio_id: studio.id,
        artist_id: userArtist.id,
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        total_hours: duration,
        hourly_rate: studio.hourly_rate || 0,
        total_amount: totalCost,
        booking_notes: bookingNotes.trim() || null,
        artist_requirements: artistRequirements.trim() || null,
        status: 'pending' as const
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingData])

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        setError('Error creating booking. Please try again.')
        return
      }

      setStep('confirmation')
      setTimeout(() => {
        onBookingSubmitted()
        onClose()
        resetForm()
      }, 3000)

    } catch (error) {
      console.error('Error submitting booking:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep('datetime')
    setSelectedDate('')
    setSelectedStartTime('')
    setSelectedEndTime('')
    setDuration(0)
    setTotalCost(0)
    setBookingNotes('')
    setArtistRequirements('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Book Studio Time</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Studio Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900">{studio.name}</h3>
            <p className="text-gray-600 text-sm">
              {studio.address}, {studio.city}, {studio.state}
            </p>
            <p className="text-gray-900 font-medium mt-1">
              ${studio.hourly_rate}/hour
            </p>
          </div>

          {step === 'datetime' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Select Date & Time</h3>
              
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedStartTime('')
                    setSelectedEndTime('')
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a date</option>
                  {Array.from(new Set(availableSlots.map(slot => slot.date))).map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <select
                        value={selectedStartTime}
                        onChange={(e) => {
                          setSelectedStartTime(e.target.value)
                          setSelectedEndTime('')
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select start time</option>
                        {availableSlots
                          .filter(slot => slot.date === selectedDate)
                          .map(slot => (
                            <option key={`${slot.date}-${slot.start_time}`} value={slot.start_time}>
                              {new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <select
                        value={selectedEndTime}
                        onChange={(e) => setSelectedEndTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={!selectedStartTime}
                      >
                        <option value="">Select end time</option>
                        {selectedStartTime && availableSlots
                          .filter(slot => slot.date === selectedDate && slot.start_time >= selectedStartTime)
                          .map(slot => (
                            <option key={`${slot.date}-${slot.end_time}`} value={slot.end_time}>
                              {new Date(`2000-01-01T${slot.end_time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {duration > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {duration} {duration === 1 ? 'hour' : 'hours'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Cost</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ${totalCost.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep('details')}
                  disabled={!selectedDate || !selectedStartTime || !selectedEndTime || duration === 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Time:</span> {selectedStartTime} - {selectedEndTime}</p>
                  <p><span className="font-medium">Duration:</span> {duration} hours</p>
                  <p><span className="font-medium">Total Cost:</span> ${totalCost.toFixed(2)}</p>
                </div>
              </div>

              {/* Booking Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking Notes (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Add any special requests or notes about your booking..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Artist Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment/Setup Requirements (Optional)
                </label>
                <textarea
                  value={artistRequirements}
                  onChange={(e) => setArtistRequirements(e.target.value)}
                  placeholder="List any specific equipment or setup requirements you need..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Payment Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Payment Information</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Payment will be processed when the studio confirms your booking. 
                      Total amount: ${totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between space-x-4">
                <Button variant="outline" onClick={() => setStep('datetime')}>
                  Back
                </Button>
                <Button onClick={handleSubmitBooking} loading={loading}>
                  Submit Booking Request
                </Button>
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Request Submitted!</h3>
                <p className="text-gray-600">
                  Your booking request has been sent to {studio.name}. 
                  You'll receive a notification once they respond.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Request Details</h4>
                <div className="space-y-1 text-sm text-left">
                  <p><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Time:</span> {selectedStartTime} - {selectedEndTime}</p>
                  <p><span className="font-medium">Duration:</span> {duration} hours</p>
                  <p><span className="font-medium">Total Cost:</span> ${totalCost.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                This window will close automatically in a few seconds...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}