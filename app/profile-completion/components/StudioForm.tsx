'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { StudioFormData, STUDIO_AMENITIES } from '@/lib/types'
import { ImageUpload, uploadImages } from './ImageUpload'

interface StudioFormProps {
  onComplete: () => void
}

interface FormState {
  data: StudioFormData
  errors: Partial<Record<keyof StudioFormData, string>>
  isSubmitting: boolean
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
]

export function StudioForm({ onComplete }: StudioFormProps) {
  const supabase = createClient()
  const [state, setState] = useState<FormState>({
    data: {
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      hourly_rate: 100,
      amenities: [],
      images: []
    },
    errors: {},
    isSubmitting: false
  })

  const updateField = (field: keyof StudioFormData, value: any) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      errors: { ...prev.errors, [field]: undefined }
    }))
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof StudioFormData, string>> = {}
    
    if (!state.data.name.trim()) {
      errors.name = 'Studio name is required'
    }
    
    if (!state.data.description.trim()) {
      errors.description = 'Description is required'
    } else if (state.data.description.length < 50) {
      errors.description = 'Description must be at least 50 characters'
    }
    
    if (!state.data.address.trim()) {
      errors.address = 'Street address is required'
    }
    
    if (!state.data.city.trim()) {
      errors.city = 'City is required'
    }
    
    if (!state.data.state) {
      errors.state = 'State is required'
    }
    
    if (!state.data.zip_code.trim()) {
      errors.zip_code = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(state.data.zip_code)) {
      errors.zip_code = 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
    }
    
    if (state.data.hourly_rate < 50 || state.data.hourly_rate > 500) {
      errors.hourly_rate = 'Hourly rate must be between $50 and $500'
    }
    
    if (state.data.images.length < 3) {
      errors.images = 'Please upload at least 3 studio images'
    }

    setState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setState(prev => ({ ...prev, isSubmitting: true }))
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Upload studio images
      const imageUrls = await uploadImages(
        state.data.images,
        'studio-images',
        'studios',
        session.user.id
      )

      // Create studio record
      const { error } = await supabase
        .from('studios')
        .insert({
          user_id: session.user.id,
          name: state.data.name,
          description: state.data.description,
          address: state.data.address,
          city: state.data.city,
          state: state.data.state,
          zip_code: state.data.zip_code,
          hourly_rate: state.data.hourly_rate,
          amenities: state.data.amenities,
          images: imageUrls
        })

      if (error) throw error

      onComplete()
    } catch (error) {
      console.error('Error creating studio profile:', error)
      setState(prev => ({
        ...prev,
        errors: { description: 'Failed to create profile. Please try again.' },
        isSubmitting: false
      }))
    }
  }

  const toggleAmenity = (amenity: string) => {
    const current = state.data.amenities
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity]
    updateField('amenities', updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complete Your Studio Profile
        </h2>
        <p className="text-gray-600">
          Showcase your space and attract talented artists
        </p>
      </div>

      {/* Studio Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Studio Name *
        </label>
        <input
          type="text"
          value={state.data.name}
          onChange={(e) => updateField('name', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            state.errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter your studio name"
        />
        {state.errors.name && (
          <p className="mt-1 text-sm text-red-600">{state.errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={state.data.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
            state.errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Describe your studio, the atmosphere, equipment, and what makes it special for artists..."
        />
        <div className="flex justify-between items-center mt-1">
          <div className="text-sm text-gray-500">
            {state.data.description.length}/500 characters (minimum 50)
          </div>
          {state.errors.description && (
            <p className="text-sm text-red-600">{state.errors.description}</p>
          )}
        </div>
      </div>

      {/* Address Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Studio Address</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={state.data.address}
            onChange={(e) => updateField('address', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              state.errors.address ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="123 Main Street"
          />
          {state.errors.address && (
            <p className="mt-1 text-sm text-red-600">{state.errors.address}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={state.data.city}
              onChange={(e) => updateField('city', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.errors.city ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="City"
            />
            {state.errors.city && (
              <p className="mt-1 text-sm text-red-600">{state.errors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <select
              value={state.data.state}
              onChange={(e) => updateField('state', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.errors.state ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select State</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
            {state.errors.state && (
              <p className="mt-1 text-sm text-red-600">{state.errors.state}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              value={state.data.zip_code}
              onChange={(e) => updateField('zip_code', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.errors.zip_code ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="12345"
            />
            {state.errors.zip_code && (
              <p className="mt-1 text-sm text-red-600">{state.errors.zip_code}</p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hourly Rate *
        </label>
        <div className="flex items-center space-x-4">
          <span className="text-2xl font-bold text-green-600">
            ${state.data.hourly_rate}
          </span>
          <div className="flex-1">
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={state.data.hourly_rate}
              onChange={(e) => updateField('hourly_rate', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$50</span>
              <span>$500</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Set your hourly rate for artists to rent your studio space
        </p>
        {state.errors.hourly_rate && (
          <p className="mt-1 text-sm text-red-600">{state.errors.hourly_rate}</p>
        )}
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Studio Amenities ({state.data.amenities.length} selected)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {STUDIO_AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 text-left ${
                state.data.amenities.includes(amenity)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>

      {/* Studio Images */}
      <div>
        <ImageUpload
          images={state.data.images}
          onImagesChange={(images) => updateField('images', images)}
          maxImages={5}
          bucketName="studio-images"
          label="Studio Photos *"
          description="Upload 3-5 high-quality photos showing your studio space, equipment, and atmosphere."
        />
        {state.errors.images && (
          <p className="mt-2 text-sm text-red-600">{state.errors.images}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={state.isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {state.isSubmitting ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              Creating Your Studio Profile...
            </>
          ) : (
            'Complete My Studio Profile'
          )}
        </button>
      </div>
    </form>
  )
}