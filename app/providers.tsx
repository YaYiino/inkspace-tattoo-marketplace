'use client'

import { AuthProvider } from '@/lib/providers/auth-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}