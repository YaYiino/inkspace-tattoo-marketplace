import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`)
    }
    
    // Get the user to check if profile needs to be completed
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      console.log('Auth callback - Profile check:', { profile, profileError })
      
      if (!profile || profileError) {
        // Profile doesn't exist, redirect to complete profile
        console.log('Redirecting to complete-profile')
        return NextResponse.redirect(`${requestUrl.origin}/complete-profile`)
      }
      
      // Profile exists, check if it has role assigned
      if (!profile.role) {
        console.log('Profile exists but no role, redirecting to complete-profile')
        return NextResponse.redirect(`${requestUrl.origin}/complete-profile`)
      }
      
      console.log('Profile complete, redirecting based on role:', profile.role)
      
      // Redirect to appropriate dashboard
      if (profile.role === 'artist') {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/artist`)
      } else if (profile.role === 'studio') {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/studio`)
      }
    }
  }

  // Redirect to the specified next URL or home page
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}