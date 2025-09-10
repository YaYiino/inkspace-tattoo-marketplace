// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.

import { init } from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

init({
  dsn: SENTRY_DSN,
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Edge runtime performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0, // Lower sampling for edge
  tracePropagationTargets: [
    'localhost',
    'antsss.com',
    /^https:\/\/.*\.supabase\.co/,
  ],

  // Minimal configuration for edge runtime
  beforeSend(event, hint) {
    // Edge runtime has limited capabilities, so minimal filtering
    
    // Remove sensitive headers
    if (event.request && event.request.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
      delete event.request.headers['x-api-key']
    }

    // Don't send certain edge-specific errors that are expected
    const ignoredErrors = [
      'The edge function has exceeded the maximum execution time',
      'Network connection lost',
      'AbortError'
    ]

    if (event.exception) {
      const errorMessage = event.exception.values?.[0]?.value || ''
      if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
        return null
      }
    }

    return event
  },

  // Minimal breadcrumb filtering for edge
  beforeBreadcrumb(breadcrumb, hint) {
    // Only keep essential breadcrumbs in edge runtime
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null
    }
    
    return breadcrumb
  },

  // Edge-specific tags
  initialScope: {
    tags: {
      component: 'edge',
      runtime: 'edge',
    },
    context: {
      app: {
        name: 'antsss-tattoo-marketplace-edge',
        version: process.env.NEXT_PUBLIC_APP_VERSION,
      }
    }
  },

  // Minimal debug output for edge
  debug: false,
})

// Simplified error reporting for edge runtime
export const captureEdgeError = async (error, context = {}) => {
  try {
    const Sentry = await import('@sentry/nextjs')
    return Sentry.withScope(scope => {
      scope.setContext('edge', {
        timestamp: new Date().toISOString(),
        ...context
      })
      return Sentry.captureException(error)
    })
  } catch (e) {
    // Silently fail in edge runtime if Sentry is not available
    console.error('Edge Sentry error:', e)
  }
}