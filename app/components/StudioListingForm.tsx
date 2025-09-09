'use client'

import { useState, useRef } from 'react'
import { Studio, StudioFormData, STUDIO_AMENITIES, STUDIO_EQUIPMENT, CANCELLATION_POLICIES } from '@/lib/types'
import Button from './Button'
import ImageUpload from '../profile-completion/components/ImageUpload'

interface StudioListingFormProps {
  studio?: Studio
  onSave: (data: Partial<StudioFormData>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function StudioListingForm({ 
  studio, 
  onSave, 
  onCancel, 
  isLoading = false 
}: StudioListingFormProps) {
  const [formData, setFormData] = useState<Partial<StudioFormData>>({
    name: studio?.name || '',
    description: studio?.description || '',
    address: studio?.address || '',
    city: studio?.city || '',
    state: studio?.state || '',
    country: studio?.country || 'United States',
    zip_code: studio?.zip_code || '',
    hourly_rate: studio?.hourly_rate || 50,
    daily_rate: studio?.daily_rate || 300,
    amenities: studio?.amenities || [],
    equipment: studio?.equipment || [],
    policies: studio?.policies || '',
    requirements: studio?.requirements || '',
    instant_book: studio?.instant_book || false,
    min_booking_hours: studio?.min_booking_hours || 2,
    max_booking_hours: studio?.max_booking_hours || 8,
    cancellation_policy: studio?.cancellation_policy || CANCELLATION_POLICIES[0],
    images: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof StudioFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const toggleArrayItem = (field: 'amenities' | 'equipment', item: string) => {
    const currentArray = formData[field] || []
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item]
    handleInputChange(field, newArray)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) newErrors.name = 'Studio name is required'
    if (!formData.description?.trim()) newErrors.description = 'Description is required'
    if (!formData.address?.trim()) newErrors.address = 'Address is required'
    if (!formData.city?.trim()) newErrors.city = 'City is required'
    if (!formData.state?.trim()) newErrors.state = 'State is required'
    if (!formData.zip_code?.trim()) newErrors.zip_code = 'Zip code is required'
    if (!formData.hourly_rate || formData.hourly_rate < 1) newErrors.hourly_rate = 'Valid hourly rate is required'
    if (!formData.daily_rate || formData.daily_rate < 1) newErrors.daily_rate = 'Valid daily rate is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error saving studio listing:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Studio Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your studio name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe your studio, atmosphere, and what makes it special..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Location</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Street address"
              />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="City"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province *
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.state ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="State"
                />
                {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code *
                </label>
                <input
                  type="text"
                  value={formData.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.zip_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="12345"
                />
                {errors.zip_code && <p className="mt-1 text-sm text-red-600">{errors.zip_code}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Pricing</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  min="1"
                  value={formData.hourly_rate || ''}
                  onChange={(e) => handleInputChange('hourly_rate', Number(e.target.value))}
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.hourly_rate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="50"
                />
              </div>
              {errors.hourly_rate && <p className="mt-1 text-sm text-red-600">{errors.hourly_rate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Rate (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  min="1"
                  value={formData.daily_rate || ''}
                  onChange={(e) => handleInputChange('daily_rate', Number(e.target.value))}
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.daily_rate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="300"
                />
              </div>
              {errors.daily_rate && <p className="mt-1 text-sm text-red-600">{errors.daily_rate}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Booking Hours
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.min_booking_hours || 2}
                onChange={(e) => handleInputChange('min_booking_hours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Booking Hours
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.max_booking_hours || 8}
                onChange={(e) => handleInputChange('max_booking_hours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Studio Amenities</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {STUDIO_AMENITIES.map((amenity) => (
              <label key={amenity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.amenities?.includes(amenity) || false}
                  onChange={() => toggleArrayItem('amenities', amenity)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Available Equipment</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {STUDIO_EQUIPMENT.map((equipment) => (
              <label key={equipment} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.equipment?.includes(equipment) || false}
                  onChange={() => toggleArrayItem('equipment', equipment)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">{equipment}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Policies & Requirements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Policies & Requirements</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Studio Policies
              </label>
              <textarea
                value={formData.policies || ''}
                onChange={(e) => handleInputChange('policies', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="House rules, noise policies, cleanup expectations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artist Requirements
              </label>
              <textarea
                value={formData.requirements || ''}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="License requirements, insurance, experience level..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Policy
              </label>
              <select
                value={formData.cancellation_policy || CANCELLATION_POLICIES[0]}
                onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {CANCELLATION_POLICIES.map((policy) => (
                  <option key={policy} value={policy}>
                    {policy}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="instant_book"
                checked={formData.instant_book || false}
                onChange={(e) => handleInputChange('instant_book', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="instant_book" className="ml-2 text-sm text-gray-700">
                Allow instant booking (artists can book without approval)
              </label>
            </div>
          </div>
        </div>

        {/* Studio Images */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Studio Photos</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload high-quality photos of your studio space. Great photos help artists understand your studio better.
          </p>
          <ImageUpload
            onImagesChange={(images) => handleInputChange('images', images)}
            maxImages={10}
            existingImages={studio?.images || []}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : studio ? 'Update Studio' : 'Create Listing'}
          </Button>
        </div>
      </form>
    </div>
  )
}