'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/providers/auth-provider'
import { createClient } from '@/lib/supabase'
import Button from '@/app/components/Button'
import { UserRole } from '@/lib/types'

export default function CompleteProfile() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const supabase = createClient()
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('artist')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    if (profile) {
      // User already has a profile, redirect to appropriate page
      if (profile.role === 'artist') {
        router.push('/dashboard/artist')
      } else {
        router.push('/dashboard/studio')
      }
      return
    }

    // Pre-fill form with available user data
    setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '')
    setIsLoading(false)
  }, [user, profile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !fullName.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: fullName.trim(),
          role: selectedRole,
        })

      if (profileError) throw profileError

      // Create role-specific profile
      if (selectedRole === 'artist') {
        const { error: artistError } = await supabase
          .from('artists')
          .insert({
            user_id: user.id,
            is_verified: false,
          })

        if (artistError) throw artistError
      } else {
        const { error: studioError } = await supabase
          .from('studios')
          .insert({
            user_id: user.id,
            name: `${fullName}'s Studio`,
            is_active: false, // Will be activated after completing studio setup
          })

        if (studioError) throw studioError
      }

      // Refresh the profile in auth context
      await refreshProfile()

      // Redirect to onboarding flow
      if (selectedRole === 'artist') {
        router.push('/onboarding/artist')
      } else {
        router.push('/onboarding/studio')
      }
    } catch (error: any) {
      console.error('Error creating profile:', error)
      setError(error.message || 'Failed to create profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Antsss!
          </h1>
          <p className="text-gray-600">
            Let's set up your profile to get started
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I am a... *
            </label>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('artist')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === 'artist'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-lg font-semibold text-gray-900">
                  Tattoo Artist
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Find studios to work in around the world
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('studio')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === 'studio'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-lg font-semibold text-gray-900">
                  Studio Owner
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  List your studio space and earn income
                </div>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || !fullName.trim()}
          >
            {isSubmitting ? 'Creating Profile...' : 'Complete Profile'}
          </Button>
        </form>
      </div>
    </div>
  )
}