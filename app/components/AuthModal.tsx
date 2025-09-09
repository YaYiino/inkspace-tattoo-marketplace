'use client'

import { useState } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import Button from './Button'
import { Database, UserRole } from '../../lib/types'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialRole?: UserRole
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialRole }) => {
  const supabase = useSupabaseClient<Database>()
  const user = useUser()
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'artist')
  const [showAuth, setShowAuth] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setShowAuth(true)
  }

  const createUserProfile = async () => {
    if (!user) return

    setIsCreatingProfile(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: selectedRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      onClose()
    } catch (error) {
      console.error('Error creating profile:', error)
    } finally {
      setIsCreatingProfile(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {user ? 'Complete Your Profile' : 'Join InkSpace'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {user && !showAuth ? (
            // User is authenticated but needs to complete profile
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 mb-4">
                  Welcome! Please select your role to complete your profile:
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setSelectedRole('artist')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedRole === 'artist'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-lg font-semibold text-gray-900">Tattoo Artist</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Find studios to work in around the world
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedRole('studio')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedRole === 'studio'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-lg font-semibold text-gray-900">Studio Owner</div>
                    <div className="text-sm text-gray-600 mt-1">
                      List your studio space and earn extra income
                    </div>
                  </button>
                </div>
              </div>
              <Button
                onClick={createUserProfile}
                size="lg"
                className="w-full"
                disabled={isCreatingProfile}
              >
                {isCreatingProfile ? 'Creating Profile...' : 'Complete Profile'}
              </Button>
            </div>
          ) : !showAuth ? (
            // Role selection for new users
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 mb-4">
                  Choose how you want to use InkSpace:
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => handleRoleSelect('artist')}
                    className="p-4 rounded-lg border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className="text-lg font-semibold text-gray-900">I'm a Tattoo Artist</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I want to find studios to work in
                    </div>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('studio')}
                    className="p-4 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="text-lg font-semibold text-gray-900">I'm a Studio Owner</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I want to list my studio space
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Supabase Auth UI
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Joining as: <span className="font-semibold text-gray-900">
                    {selectedRole === 'artist' ? 'Tattoo Artist' : 'Studio Owner'}
                  </span>
                </p>
                <button
                  onClick={() => setShowAuth(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                >
                  Change role
                </button>
              </div>
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#7c3aed',
                        brandAccent: '#6d28d9',
                        brandButtonText: 'white',
                        defaultButtonBackground: '#f3f4f6',
                        defaultButtonBackgroundHover: '#e5e7eb',
                        inputBackground: 'white',
                        inputBorder: '#d1d5db',
                        inputBorderHover: '#9ca3af',
                        inputBorderFocus: '#7c3aed',
                      },
                      borderWidths: {
                        buttonBorderWidth: '1px',
                        inputBorderWidth: '1px',
                      },
                      radii: {
                        borderRadiusButton: '0.5rem',
                        buttonBorderRadius: '0.5rem',
                        inputBorderRadius: '0.5rem',
                      },
                    },
                  },
                }}
                providers={['google']}
                redirectTo={`${window.location.origin}/auth/callback`}
                onlyThirdPartyProviders={false}
                magicLink={true}
                view="magic_link"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal