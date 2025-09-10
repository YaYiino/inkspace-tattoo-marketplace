'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { monitoring, type MonitoringConfig } from './index'
import { GlobalErrorBoundary } from '../errors/GlobalErrorBoundary'
import { ToastProvider } from '../notifications/toast'
// import { ErrorDebugger } from '../errors/dev-tools' // Temporarily disabled
import { 
  useGlobalErrorHandler, 
  usePerformanceMonitoring, 
  useUserSessionMonitoring 
} from '../errors/hooks'

interface MonitoringContextType {
  isInitialized: boolean
  config: MonitoringConfig
  logError: typeof monitoring.logError
  trackEvent: typeof monitoring.trackEvent
  trackPerformance: typeof monitoring.trackPerformance
  setUser: typeof monitoring.setUser
  getErrorStats: typeof monitoring.getErrorStats
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined)

export function useMonitoring() {
  const context = useContext(MonitoringContext)
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider')
  }
  return context
}

interface MonitoringProviderProps {
  children: ReactNode
  config?: Partial<MonitoringConfig>
  userId?: string
  userEmail?: string
  username?: string
}

export function MonitoringProvider({ 
  children, 
  config: customConfig,
  userId,
  userEmail,
  username,
}: MonitoringProviderProps) {
  // Initialize monitoring hooks
  useGlobalErrorHandler()
  usePerformanceMonitoring()
  useUserSessionMonitoring(userId)

  useEffect(() => {
    // Initialize monitoring service
    monitoring.initialize(customConfig).catch(error => {
      console.error('Failed to initialize monitoring:', error)
    })

    // Set user if provided
    if (userId) {
      monitoring.setUser(userId, userEmail, username)
    }
  }, [customConfig, userId, userEmail, username])

  const contextValue: MonitoringContextType = {
    isInitialized: monitoring.isInitialized(),
    config: monitoring.getConfig(),
    logError: monitoring.logError.bind(monitoring),
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackPerformance: monitoring.trackPerformance.bind(monitoring),
    setUser: monitoring.setUser.bind(monitoring),
    getErrorStats: monitoring.getErrorStats.bind(monitoring),
  }

  return (
    <MonitoringContext.Provider value={contextValue}>
      <GlobalErrorBoundary>
        <ToastProvider>
          {children}
          {/* {process.env.NODE_ENV === 'development' && (
            <ErrorDebugger enabled={true} position="bottom-right" />
          )} */}
        </ToastProvider>
      </GlobalErrorBoundary>
    </MonitoringContext.Provider>
  )
}