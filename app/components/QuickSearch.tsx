'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from './Button'

export default function QuickSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    if (location.trim()) {
      // Try to parse city, state from location input
      const locationParts = location.split(',').map(part => part.trim())
      if (locationParts.length >= 1) {
        params.set('city', locationParts[0])
      }
      if (locationParts.length >= 2) {
        params.set('state', locationParts[1])
      }
    }

    const searchUrl = params.toString() 
      ? `/studios?${params.toString()}`
      : '/studios'
    
    router.push(searchUrl)
  }

  const popularSearches = [
    { label: 'New York', params: '?city=New+York&state=New+York' },
    { label: 'Los Angeles', params: '?city=Los+Angeles&state=California' },
    { label: 'Miami', params: '?city=Miami&state=Florida' },
    { label: 'Austin', params: '?city=Austin&state=Texas' },
    { label: 'Instant Book', params: '?instant_book=true' },
    { label: 'Private Studios', params: '?amenities=Private+Rooms' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Perfect Studio</h2>
        <p className="text-gray-600">
          Search thousands of tattoo studios worldwide
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you looking for?
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Studio name, style, equipment..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Where?
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search Studios
        </Button>
      </form>

      {/* Popular Searches */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Searches</h3>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((search) => (
            <button
              key={search.label}
              onClick={() => router.push(`/studios${search.params}`)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {search.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">350+</div>
            <div className="text-sm text-gray-600">Studios</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">50+</div>
            <div className="text-sm text-gray-600">Cities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">1200+</div>
            <div className="text-sm text-gray-600">Artists</div>
          </div>
        </div>
      </div>
    </div>
  )
}