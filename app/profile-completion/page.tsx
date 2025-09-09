'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UserType, Profile } from '@/lib/types'
import { ProgressIndicator } from './components/ProgressIndicator'
import { RoleSelection } from './components/RoleSelection'
import { ArtistForm } from './components/ArtistForm'
import { StudioForm } from './components/StudioForm'

interface ProfileCompletionState {
  step: number
  userType: UserType | null
  isLoading: boolean
  error: string | null
}

export default function ProfileCompletion() {
  const router = useRouter()
  const supabase = createClient()
  
  const [state, setState] = useState<ProfileCompletionState>({
    step: 1,
    userType: null,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    checkAuthAndProfile()
  }, [])

  const checkAuthAndProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Check if profile already exists and is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile?.user_type) {
        // Check if additional profile data exists
        if (profile.user_type === 'artist') {
          const { data: artist } = await supabase
            .from('artists')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
          
          if (artist) {
            router.push('/dashboard/artist')
            return
          }
        } else {
          const { data: studio } = await supabase
            .from('studios')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
          
          if (studio) {
            router.push('/dashboard/studio')
            return
          }
        }
        
        // User has selected role but hasn't completed profile
        setState(prev => ({ ...prev, userType: profile.user_type, step: 2, isLoading: false }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setState(prev => ({ ...prev, error: 'Failed to load profile data', isLoading: false }))
    }
  }

  const handleRoleSelect = async (userType: UserType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('profiles')
        .update({ user_type: userType })
        .eq('id', session.user.id)

      if (error) throw error

      setState(prev => ({ ...prev, userType, step: 2 }))
    } catch (error) {
      console.error('Error updating user type:', error)
      setState(prev => ({ ...prev, error: 'Failed to save role selection' }))
    }
  }

  const handleProfileComplete = () => {
    // Redirect to appropriate dashboard
    if (state.userType === 'artist') {
      router.push('/dashboard/artist')
    } else {
      router.push('/dashboard/studio')
    }
  }

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{state.error}</p>
          </div>
        </div>
      </div>
    )
  }

  const totalSteps = 2
  const stepTitles = ['Select Your Role', 'Complete Your Profile']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Help us create the perfect profile to connect you with opportunities
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator 
          currentStep={state.step}
          totalSteps={totalSteps}
          stepTitles={stepTitles}
        />

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          {state.step === 1 && (
            <RoleSelection onRoleSelect={handleRoleSelect} />
          )}
          
          {state.step === 2 && state.userType === 'artist' && (
            <ArtistForm onComplete={handleProfileComplete} />
          )}
          
          {state.step === 2 && state.userType === 'studio' && (
            <StudioForm onComplete={handleProfileComplete} />
          )}
        </div>
      </div>
    </div>
  )
}