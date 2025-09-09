'use client'

import { useEffect, useRef } from 'react'

interface StudioMapProps {
  studios: Array<{
    id: string
    name: string
    latitude?: number
    longitude?: number
    city?: string
    state?: string
    hourly_rate?: number
  }>
  selectedStudioId?: string
  onStudioSelect?: (studioId: string) => void
  className?: string
}

export default function StudioMap({ 
  studios, 
  selectedStudioId, 
  onStudioSelect, 
  className = '' 
}: StudioMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  // This is a placeholder implementation
  // In a real app, you'd integrate with Google Maps, Mapbox, or another mapping service
  useEffect(() => {
    if (!mapRef.current) return

    // Placeholder map initialization
    // Replace this with actual map library integration
    console.log('Initializing map with studios:', studios)
  }, [studios])

  const handleStudioClick = (studioId: string) => {
    if (onStudioSelect) {
      onStudioSelect(studioId)
    }
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full min-h-96">
        {/* Placeholder Map - Replace with actual map implementation */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
          <div className="text-center text-gray-600">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-lg font-medium mb-2">Interactive Map</p>
            <p className="text-sm">Coming Soon - Studio locations will be displayed here</p>
            <p className="text-xs mt-2 text-gray-500">
              {studios.length} studios in this area
            </p>
          </div>
        </div>
      </div>

      {/* Studio Markers Overlay (Placeholder) */}
      <div className="absolute inset-4 pointer-events-none">
        <div className="relative h-full">
          {studios.slice(0, 3).map((studio, index) => (
            <div
              key={studio.id}
              className={`absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                selectedStudioId === studio.id ? 'z-20' : 'z-10'
              }`}
              style={{
                left: `${20 + index * 25}%`,
                top: `${30 + index * 15}%`
              }}
              onClick={() => handleStudioClick(studio.id)}
            >
              <div className={`bg-white rounded-lg shadow-lg p-2 border-2 transition-all ${
                selectedStudioId === studio.id 
                  ? 'border-purple-500 scale-110' 
                  : 'border-gray-300 hover:border-purple-300 hover:scale-105'
              }`}>
                <div className="text-xs font-medium text-gray-900 truncate max-w-20">
                  {studio.name}
                </div>
                <div className="text-xs text-gray-600">
                  ${studio.hourly_rate}/hr
                </div>
              </div>
              
              {/* Map Pin */}
              <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${
                selectedStudioId === studio.id ? 'bg-purple-500' : 'bg-gray-400'
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          type="button"
          className="bg-white shadow-md rounded-md p-2 hover:bg-gray-50 transition-colors"
          title="Zoom In"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          type="button"
          className="bg-white shadow-md rounded-md p-2 hover:bg-gray-50 transition-colors"
          title="Zoom Out"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
      </div>

      {/* Development Notice */}
      <div className="absolute bottom-4 left-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
        Map Integration in Development
      </div>
    </div>
  )
}

// Utility functions for future map integration
export const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  // Placeholder for geocoding API integration
  console.log('Geocoding address:', address)
  return null
}

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  // Calculate distance between two points using Haversine formula
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lng2 - lng1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const toRad = (value: number): number => {
  return value * Math.PI / 180
}