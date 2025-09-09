'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider, useUser } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import { MonitoringProvider } from '@/lib/monitoring/MonitoringProvider'

function MonitoringWrapper({ children }: { children: React.ReactNode }) {
  const user = useUser()

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
  const [supabase] = useState(() => createClientComponentClient())

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <MonitoringWrapper>
        {children}
      </MonitoringWrapper>
    </SessionContextProvider>
  )
}