'use client'

import { useState } from 'react'
import { StudioSearch, STUDIO_AMENITIES, STUDIO_EQUIPMENT } from '@/lib/types'
import Button from './Button'

interface StudioSearchFiltersProps {
  filters: StudioSearch
  onFiltersChange: (filters: StudioSearch) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export default function StudioSearchFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters
}: StudioSearchFiltersProps) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || 0,
    max: filters.max_price || 500
  })

  const handleLocationChange = (field: 'city' | 'state' | 'country', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value || undefined
    })
  }

  const handlePriceChange = (field: 'min' | 'max', value: number) => {
    const newRange = { ...priceRange, [field]: value }
    setPriceRange(newRange)
    
    onFiltersChange({
      ...filters,
      min_price: newRange.min > 0 ? newRange.min : undefined,
      max_price: newRange.max < 500 ? newRange.max : undefined
    })
  }

  const toggleArrayFilter = (
    field: 'amenities' | 'equipment',
    item: string
  ) => {
    const currentArray = filters[field] || []
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item]
    
    onFiltersChange({
      ...filters,
      [field]: newArray.length > 0 ? newArray : undefined
    })
  }

  const toggleInstantBook = () => {
    onFiltersChange({
      ...filters,
      instant_book: filters.instant_book ? undefined : true
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Location Filters */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Location</h4>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={filters.city || ''}
                onChange={(e) => handleLocationChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <input
                type="text"
                value={filters.state || ''}
                onChange={(e) => handleLocationChange('state', e.target.value)}
                placeholder="State/Province"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <select
                value={filters.country || ''}
                onChange={(e) => handleLocationChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Any Country</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
              </select>
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range (per hour)</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="500"
                value={priceRange.min}
                onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12">${priceRange.min}</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="500"
                value={priceRange.max}
                onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12">${priceRange.max}{priceRange.max === 500 && '+'}</span>
            </div>
            <div className="text-xs text-gray-500 text-center">
              ${priceRange.min} - ${priceRange.max}{priceRange.max === 500 && '+'} per hour
            </div>
          </div>
        </div>

        {/* Instant Booking */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.instant_book || false}
              onChange={toggleInstantBook}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Instant booking available</span>
          </label>
        </div>

        {/* Amenities */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Amenities</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {STUDIO_AMENITIES.map((amenity) => (
              <label key={amenity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.amenities?.includes(amenity) || false}
                  onChange={() => toggleArrayFilter('amenities', amenity)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 text-sm"
                />
                <span className="ml-2 text-sm text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Equipment</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {STUDIO_EQUIPMENT.map((equipment) => (
              <label key={equipment} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.equipment?.includes(equipment) || false}
                  onChange={() => toggleArrayFilter('equipment', equipment)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 text-sm"
                />
                <span className="ml-2 text-sm text-gray-700">{equipment}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}