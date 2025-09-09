'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ArtistFormData, ARTIST_SPECIALTIES } from '@/lib/types'
import { ImageUpload, uploadImages } from './ImageUpload'

interface ArtistFormProps {
  onComplete: () => void
}

interface FormState {
  data: ArtistFormData
  errors: Partial<Record<keyof ArtistFormData, string>>
  isSubmitting: boolean
}

export function ArtistForm({ onComplete }: ArtistFormProps) {
  const supabase = createClient()
  const [state, setState] = useState<FormState>({
    data: {
      full_name: '',
      bio: '',
      experience_years: 1,
      specialties: [],
      portfolio_images: []
    },
    errors: {},
    isSubmitting: false
  })

  const updateField = (field: keyof ArtistFormData, value: any) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      errors: { ...prev.errors, [field]: undefined }
    }))
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ArtistFormData, string>> = {}
    
    if (!state.data.full_name.trim()) {
      errors.full_name = 'Full name is required'
    }
    
    if (!state.data.bio.trim()) {
      errors.bio = 'Bio is required'
    } else if (state.data.bio.length < 50) {
      errors.bio = 'Bio must be at least 50 characters'
    }
    
    if (state.data.experience_years < 1 || state.data.experience_years > 50) {
      errors.experience_years = 'Experience must be between 1 and 50 years'
    }
    
    if (state.data.specialties.length === 0) {
      errors.specialties = 'Please select at least one specialty'
    }
    
    if (state.data.portfolio_images.length < 3) {
      errors.portfolio_images = 'Please upload at least 3 portfolio images'
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

      // Upload portfolio images
      const imageUrls = await uploadImages(
        state.data.portfolio_images,
        'portfolio-images',
        'artists',
        session.user.id
      )

      // Update profile with full name
      await supabase
        .from('profiles')
        .update({ full_name: state.data.full_name })
        .eq('id', session.user.id)

      // Create artist record
      const { error } = await supabase
        .from('artists')
        .insert({
          user_id: session.user.id,
          bio: state.data.bio,
          experience_years: state.data.experience_years,
          specialties: state.data.specialties,
          portfolio_images: imageUrls
        })

      if (error) throw error

      onComplete()
    } catch (error) {
      console.error('Error creating artist profile:', error)
      setState(prev => ({
        ...prev,
        errors: { bio: 'Failed to create profile. Please try again.' },
        isSubmitting: false
      }))
    }
  }

  const toggleSpecialty = (specialty: string) => {
    const current = state.data.specialties
    const updated = current.includes(specialty)
      ? current.filter(s => s !== specialty)
      : [...current, specialty]
    updateField('specialties', updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complete Your Artist Profile
        </h2>
        <p className="text-gray-600">
          Help clients discover your unique style and expertise
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          value={state.data.full_name}
          onChange={(e) => updateField('full_name', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            state.errors.full_name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter your full name"
        />
        {state.errors.full_name && (
          <p className="mt-1 text-sm text-red-600">{state.errors.full_name}</p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bio *
        </label>
        <textarea
          value={state.data.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
            state.errors.bio ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Tell clients about your artistic journey, style, and what makes your work unique..."
        />
        <div className="flex justify-between items-center mt-1">
          <div className="text-sm text-gray-500">
            {state.data.bio.length}/500 characters (minimum 50)
          </div>
          {state.errors.bio && (
            <p className="text-sm text-red-600">{state.errors.bio}</p>
          )}
        </div>
      </div>

      {/* Years of Experience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Years of Experience *
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="1"
            max="50"
            value={state.data.experience_years}
            onChange={(e) => updateField('experience_years', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="w-16 text-center">
            <span className="text-lg font-semibold text-blue-600">
              {state.data.experience_years}
            </span>
            <div className="text-xs text-gray-500">
              {state.data.experience_years === 1 ? 'year' : 'years'}
            </div>
          </div>
        </div>
        {state.errors.experience_years && (
          <p className="mt-1 text-sm text-red-600">{state.errors.experience_years}</p>
        )}
      </div>

      {/* Specialties */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Specialties * ({state.data.specialties.length} selected)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ARTIST_SPECIALTIES.map((specialty) => (
            <button
              key={specialty}
              type="button"
              onClick={() => toggleSpecialty(specialty)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                state.data.specialties.includes(specialty)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {specialty}
            </button>
          ))}
        </div>
        {state.errors.specialties && (
          <p className="mt-2 text-sm text-red-600">{state.errors.specialties}</p>
        )}
      </div>

      {/* Portfolio Images */}
      <div>
        <ImageUpload
          images={state.data.portfolio_images}
          onImagesChange={(images) => updateField('portfolio_images', images)}
          maxImages={5}
          bucketName="portfolio-images"
          label="Portfolio Images *"
          description="Upload 3-5 high-quality images of your best work. These will be the first thing clients see."
        />
        {state.errors.portfolio_images && (
          <p className="mt-2 text-sm text-red-600">{state.errors.portfolio_images}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={state.isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {state.isSubmitting ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              Creating Your Profile...
            </>
          ) : (
            'Complete My Artist Profile'
          )}
        </button>
      </div>
    </form>
  )
}