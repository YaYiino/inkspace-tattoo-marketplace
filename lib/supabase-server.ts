import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

// Server-side Supabase client
export const createServerClient = () => {
  const cookieStore = cookies()
  
  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Middleware client
export const createMiddlewareClient = (request: Request) => {
  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.headers.get('cookie')
          if (!cookie) return undefined
          const match = cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
          return match?.[2]
        },
        set() {
          // Not implemented for middleware
        },
        remove() {
          // Not implemented for middleware
        },
      },
    }
  )
}