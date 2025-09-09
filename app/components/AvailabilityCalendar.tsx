'use client'

import { useState, useEffect } from 'react'
import { StudioAvailability, AvailabilityFormData } from '@/lib/types'
import Button from './Button'

interface AvailabilityCalendarProps {
  studioId: string
  onSave: (availability: AvailabilityFormData) => Promise<void>
  onDelete: (availabilityId: string) => Promise<void>
  existingAvailability?: StudioAvailability[]
}

export default function AvailabilityCalendar({
  studioId,
  onSave,
  onDelete,
  existingAvailability = []
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showTimeForm, setShowTimeForm] = useState(false)
  const [timeSlots, setTimeSlots] = useState<AvailabilityFormData[]>([])
  const [newTimeSlot, setNewTimeSlot] = useState<AvailabilityFormData>({
    date: '',
    start_time: '09:00',
    end_time: '17:00'
  })

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getCurrentMonthDates = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const dates = []
    
    // Previous month's trailing dates
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      dates.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isToday: false,
        hasAvailability: false
      })
    }
    
    // Current month dates
    const today = new Date()
    for (let date = 1; date <= daysInMonth; date++) {
      const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      const isToday = 
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === date

      const hasAvailability = existingAvailability.some(
        av => av.date === currentDateStr && av.is_available
      )

      dates.push({
        date,
        isCurrentMonth: true,
        isToday,
        hasAvailability,
        fullDate: currentDateStr
      })
    }

    // Next month's leading dates
    const remainingCells = 42 - dates.length
    for (let date = 1; date <= remainingCells; date++) {
      dates.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        hasAvailability: false
      })
    }

    return dates
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const selectDate = (dateInfo: any) => {
    if (!dateInfo.isCurrentMonth) return
    
    setSelectedDate(dateInfo.fullDate)
    setNewTimeSlot(prev => ({ ...prev, date: dateInfo.fullDate }))
    
    // Load existing time slots for this date
    const existingForDate = existingAvailability.filter(
      av => av.date === dateInfo.fullDate
    )
    setTimeSlots(existingForDate.map(av => ({
      date: av.date,
      start_time: av.start_time,
      end_time: av.end_time,
      price_override: av.price_override
    })))
    
    setShowTimeForm(true)
  }

  const addTimeSlot = async () => {
    try {
      await onSave(newTimeSlot)
      setTimeSlots(prev => [...prev, newTimeSlot])
      setNewTimeSlot(prev => ({
        ...prev,
        start_time: '09:00',
        end_time: '17:00',
        price_override: undefined
      }))
    } catch (error) {
      console.error('Error saving time slot:', error)
    }
  }

  const removeTimeSlot = async (index: number) => {
    const timeSlot = timeSlots[index]
    const existingSlot = existingAvailability.find(
      av => av.date === timeSlot.date && 
           av.start_time === timeSlot.start_time &&
           av.end_time === timeSlot.end_time
    )
    
    if (existingSlot) {
      try {
        await onDelete(existingSlot.id)
      } catch (error) {
        console.error('Error deleting time slot:', error)
        return
      }
    }
    
    setTimeSlots(prev => prev.filter((_, i) => i !== index))
  }

  const isValidTimeSlot = () => {
    return newTimeSlot.start_time < newTimeSlot.end_time
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Manage Availability</h2>
        <div className="text-sm text-gray-600">
          Click on a date to set available times
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {getCurrentMonthDates().map((dateInfo, index) => (
              <button
                key={index}
                onClick={() => selectDate(dateInfo)}
                disabled={!dateInfo.isCurrentMonth}
                className={`
                  aspect-square p-2 text-sm rounded-md transition-colors relative
                  ${!dateInfo.isCurrentMonth 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-purple-50 cursor-pointer'
                  }
                  ${dateInfo.isToday 
                    ? 'bg-purple-100 font-semibold' 
                    : ''
                  }
                  ${selectedDate === dateInfo.fullDate 
                    ? 'bg-purple-200 ring-2 ring-purple-400' 
                    : ''
                  }
                `}
              >
                {dateInfo.date}
                {dateInfo.hasAvailability && (
                  <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-100 rounded-full mr-2"></div>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Time Slots Management */}
        {showTimeForm && selectedDate && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Availability for {new Date(selectedDate).toLocaleDateString()}
            </h3>

            {/* Existing Time Slots */}
            {timeSlots.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Current Time Slots</h4>
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">
                          {slot.start_time} - {slot.end_time}
                        </span>
                        {slot.price_override && (
                          <span className="text-sm text-green-600">
                            ${slot.price_override}/hr
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeTimeSlot(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Time Slot */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Add New Time Slot</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newTimeSlot.start_time}
                    onChange={(e) => setNewTimeSlot(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newTimeSlot.end_time}
                    onChange={(e) => setNewTimeSlot(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Price Override (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={newTimeSlot.price_override || ''}
                    onChange={(e) => setNewTimeSlot(prev => ({ 
                      ...prev, 
                      price_override: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Leave blank to use default rate"
                  />
                </div>
              </div>

              <Button
                onClick={addTimeSlot}
                disabled={!isValidTimeSlot()}
                className="w-full"
              >
                Add Time Slot
              </Button>
            </div>
          </div>
        )}

        {!showTimeForm && (
          <div className="flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium mb-2">Select a Date</p>
              <p className="text-sm">Click on any date to manage availability for that day</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}