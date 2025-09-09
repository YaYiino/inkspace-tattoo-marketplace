'use client'

import { useCallback, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger'
import { analytics } from '@/lib/monitoring/analytics'
import { captureError } from '@/lib/monitoring/sentry'

// Hook for handling async errors
export function useAsyncError() {
  return useCallback((error: Error | unknown, context?: Record<string, any>) => {
    const normalizedError = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : 'Unknown async error')

    logger.error('Async error occurred', normalizedError, {
      type: 'async_error',
      ...context,
    })

    analytics.errorOccurred(normalizedError, {
      type: 'async_error',
      ...context,
    })

    captureError(normalizedError, {
      type: 'async_error',
      ...context,
    })

    // Re-throw the error if it's in development for better debugging
    if (process.env.NODE_ENV === 'development') {
      throw normalizedError
    }
  }, [])
}

// Hook for handling form validation errors
export function useFormError() {
  return useCallback((field: string, error: string | Error, formData?: Record<string, any>) => {
    const normalizedError = typeof error === 'string' ? new Error(error) : error

    logger.warn('Form validation error', normalizedError, {
      type: 'form_validation_error',
      field,
      formData: formData ? Object.keys(formData) : undefined, // Don't log actual form data for privacy
    })

    analytics.track({
      name: 'form_validation_error',
      properties: {
        field,
        error: normalizedError.message,
        form: formData ? Object.keys(formData).join(',') : undefined,
      },
    })
  }, [])
}

// Hook for handling API errors
export function useApiError() {
  return useCallback((error: Error | unknown, endpoint: string, method: string, context?: Record<string, any>) => {
    const normalizedError = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : 'API request failed')

    logger.error('API error occurred', normalizedError, {
      type: 'api_error',
      endpoint,
      method,
      ...context,
    })

    analytics.errorOccurred(normalizedError, {
      type: 'api_error',
      endpoint,
      method,
      ...context,
    })

    captureError(normalizedError, {
      type: 'api_error',
      endpoint,
      method,
      ...context,
    })
  }, [])
}

// Hook for setting up global error handlers
export function useGlobalErrorHandler() {
  const handleError = useAsyncError()

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      handleError(event.reason, {
        type: 'unhandled_promise_rejection',
        promise: event.promise,
      })
    }

    // Handle uncaught errors
    const handleUncaughtError = (event: ErrorEvent) => {
      event.preventDefault()
      const error = new Error(event.message)
      error.stack = `${event.filename}:${event.lineno}:${event.colno}`
      
      handleError(error, {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleUncaughtError)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleUncaughtError)
    }
  }, [handleError])
}

// Hook for performance monitoring
export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const { name, value } = entry as any

        // Log performance metrics
        logger.performance(`Performance metric: ${name}`, value, {
          entryType: entry.entryType,
          startTime: entry.startTime,
        })

        // Track in analytics
        analytics.performanceMetric(name, value, {
          entryType: entry.entryType,
          startTime: entry.startTime,
        })

        // Alert on poor performance
        const thresholds = {
          'largest-contentful-paint': 2500,
          'first-input-delay': 100,
          'cumulative-layout-shift': 0.1,
        }

        if (name in thresholds && value > thresholds[name as keyof typeof thresholds]) {
          logger.warn(`Poor performance detected: ${name}`, undefined, {
            metric: name,
            value,
            threshold: thresholds[name as keyof typeof thresholds],
          })
        }
      }
    })

    // Observe different performance entry types
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (error) {
      // Some browsers might not support all entry types
      logger.debug('Performance observer setup failed', error as Error)
    }

    return () => {
      observer.disconnect()
    }
  }, [])
}

// Hook for user session monitoring
export function useUserSessionMonitoring(userId?: string) {
  useEffect(() => {
    if (!userId) return

    const startTime = Date.now()
    let interactionCount = 0
    let lastInteraction = startTime

    const trackInteraction = () => {
      interactionCount++
      lastInteraction = Date.now()
    }

    // Track user interactions
    const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, trackInteraction, { passive: true })
    })

    // Track session on unload
    const trackSession = () => {
      const sessionDuration = Date.now() - startTime
      const inactiveDuration = Date.now() - lastInteraction

      analytics.track({
        name: 'session_end',
        properties: {
          duration: sessionDuration,
          interactions: interactionCount,
          inactive_duration: inactiveDuration,
          engagement: interactionCount / (sessionDuration / 1000), // interactions per second
        },
      })
    }

    window.addEventListener('beforeunload', trackSession)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        trackSession()
      }
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, trackInteraction)
      })
      window.removeEventListener('beforeunload', trackSession)
      window.removeEventListener('visibilitychange', trackSession)
    }
  }, [userId])
}

// Custom hook for retry logic
export function useRetry<T>(
  asyncFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): [() => Promise<T>, { retryCount: number; isRetrying: boolean }] {
  const handleError = useAsyncError()

  const retry = useCallback(async (): Promise<T> => {
    let lastError: Error | unknown
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          handleError(error, {
            type: 'retry_exhausted',
            maxRetries,
            attempts: attempt + 1,
          })
          throw error
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = delay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, lastError as Error, {
          type: 'retry_attempt',
          attempt: attempt + 1,
          maxRetries,
          delay: waitTime,
        })
      }
    }
    
    throw lastError
  }, [asyncFn, maxRetries, delay, handleError])

  return [retry, { retryCount: 0, isRetrying: false }]
}