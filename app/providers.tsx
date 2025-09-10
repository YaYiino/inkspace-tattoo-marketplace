'use client'

import { AuthProvider, useAuth } from '@/lib/providers/auth-provider'
import { MonitoringProvider } from '@/lib/monitoring/MonitoringProvider'

function MonitoringWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <MonitoringProvider
      userId={user?.id}
      userEmail={user?.email}
      username={user?.user_metadata?.username}
      config={{
        enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
        enableSessionRecording: process.env.NODE_ENV === 'production',
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      }}
    >
      {children}
    </MonitoringProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MonitoringWrapper>
        {children}
      </MonitoringWrapper>
    </AuthProvider>
  )
}