'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Studio } from '@/lib/types'
import Button from './Button'

interface StudioCardProps {
  studio: Studio
  className?: string
}

export default function StudioCard({ studio, className = '' }: StudioCardProps) {
  const [imageError, setImageError] = useState(false)
  const router = useRouter()

  const handleViewDetails = () => {
    router.push(`/studios/${studio.id}`)
  }

  const formatLocation = () => {
    const parts = [studio.city, studio.state, studio.country]
      .filter(Boolean)
      .filter(part => part !== 'United States') // Don't show US for US studios
    return parts.join(', ')
  }

  const getMainImage = () => {
    if (!studio.images || studio.images.length === 0) {
      return null
    }
    return studio.images[0]
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${className}`}>
      {/* Studio Image */}
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {getMainImage() && !imageError ? (
          <img
            src={getMainImage()!}
            alt={studio.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
            onClick={handleViewDetails}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
            onClick={handleViewDetails}
          >
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-sm font-medium">{studio.name}</p>
            </div>
          </div>
        )}
        
        {/* Instant Book Badge */}
        {studio.instant_book && (
          <div className="absolute top-3 right-3">
            <span className="bg-green-600 text-white px-2 py-1 text-xs font-medium rounded-full">
              Instant Book
            </span>
          </div>
        )}

        {/* Image Count */}
        {studio.images && studio.images.length > 1 && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-black/70 text-white px-2 py-1 text-xs rounded">
              +{studio.images.length - 1}
            </span>
          </div>
        )}
      </div>

      {/* Studio Details */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 
            className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
            onClick={handleViewDetails}
          >
            {studio.name}
          </h3>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              ${studio.hourly_rate}
            </div>
            <div className="text-xs text-gray-500">per hour</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          {formatLocation()}
        </p>

        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {studio.description ? truncateText(studio.description, 120) : 'No description available'}
        </p>

        {/* Amenities Preview */}
        {studio.amenities && studio.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {studio.amenities.slice(0, 3).map((amenity, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {studio.amenities.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{studio.amenities.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Equipment Preview */}
        {studio.equipment && studio.equipment.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Equipment:</div>
            <div className="flex flex-wrap gap-1">
              {studio.equipment.slice(0, 2).map((equipment, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                >
                  {equipment}
                </span>
              ))}
              {studio.equipment.length > 2 && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  +{studio.equipment.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Booking Options */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {studio.min_booking_hours && studio.max_booking_hours && (
              <span>{studio.min_booking_hours}-{studio.max_booking_hours}h sessions</span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
            >
              View Details
            </Button>
            {studio.instant_book ? (
              <Button
                size="sm"
                onClick={handleViewDetails}
              >
                Book Now
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleViewDetails}
              >
                Request
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}