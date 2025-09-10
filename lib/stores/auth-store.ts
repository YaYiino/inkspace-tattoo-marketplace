import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        profile: null,
        isLoading: true,
        error: null,

        setUser: (user) => set({ user }, false, 'setUser'),
        setProfile: (profile) => set({ profile }, false, 'setProfile'),
        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),
        signOut: () => set({ 
          user: null, 
          profile: null, 
          error: null 
        }, false, 'signOut'),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          user: state.user,
          profile: state.profile 
        }),
      }
    )
  )
)