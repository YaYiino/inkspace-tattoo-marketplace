// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.

import { init, replayIntegration, browserTracingIntegration } from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

init({
  dsn: SENTRY_DSN,
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  tracePropagationTargets: [
    'localhost',
    'antsss.com',
    /^https:\/\/.*\.supabase\.co\/rest\/v1/,
    /^https:\/\/.*\.supabase\.co\/auth\/v1/,
  ],

  // Session replay configuration
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    // Browser performance tracing
    browserTracingIntegration({
      // Set up automatic route change tracking for Next.js App Router
      enableInp: true,
    }),
    
    // Session replay for debugging
    replayIntegration({
      // Mask all text content, inputs, and media for privacy
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Data sanitization and privacy
  beforeSend(event, hint) {
    // Filter out sensitive information
    if (event.user) {
      // Keep only essential user data
      event.user = {
        id: event.user.id,
        // Remove email, username, and other PII
      }
    }

    // Filter sensitive request data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
        delete event.request.headers['X-API-Key']
      }

      // Remove sensitive query parameters
      if (event.request.query_string) {
        event.request.query_string = event.request.query_string
          .replace(/([?&])(token|key|secret|password)=[^&]*/gi, '$1$2=***')
      }
    }

    // Filter sensitive form data
    if (event.extra && event.extra.form) {
      const sensitiveFields = ['password', 'token', 'key', 'secret', 'email']
      sensitiveFields.forEach(field => {
        if (event.extra.form[field]) {
          event.extra.form[field] = '***'
        }
      })
    }

    // Don't send events for known non-critical errors
    const ignoredErrors = [
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Loading chunk',
      'ChunkLoadError'
    ]

    if (event.exception) {
      const errorMessage = event.exception.values?.[0]?.value || ''
      if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
        return null
      }
    }

    return event
  },

  // Enhanced error context
  beforeBreadcrumb(breadcrumb, hint) {
    // Don't log sensitive console messages
    if (breadcrumb.category === 'console') {
      const message = breadcrumb.message || ''
      if (message.toLowerCase().includes('password') || 
          message.toLowerCase().includes('token') ||
          message.toLowerCase().includes('secret')) {
        return null
      }
    }

    // Add extra context for navigation breadcrumbs
    if (breadcrumb.category === 'navigation') {
      breadcrumb.data = {
        ...breadcrumb.data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    }

    return breadcrumb
  },

  // Custom error tags for better organization
  initialScope: {
    tags: {
      component: 'client',
      platform: 'web',
    },
    context: {
      app: {
        name: 'antsss-tattoo-marketplace',
        version: process.env.NEXT_PUBLIC_APP_VERSION,
        build: process.env.NEXT_PUBLIC_BUILD_ID,
      }
    }
  },

  // Development settings
  debug: process.env.NODE_ENV !== 'production',
  
  // Transport options for production
  transport: process.env.NODE_ENV === 'production' ? undefined : undefined,
})

// Export helper functions for custom error reporting
export const reportError = (error, context = {}) => {
  if (typeof window !== 'undefined') {
    import('@sentry/nextjs').then(Sentry => {
      Sentry.withScope(scope => {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key])
        })
        Sentry.captureException(error)
      })
    })
  }
}

export const reportMessage = (message, level = 'info', context = {}) => {
  if (typeof window !== 'undefined') {
    import('@sentry/nextjs').then(Sentry => {
      Sentry.withScope(scope => {
        scope.setLevel(level)
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key])
        })
        Sentry.captureMessage(message)
      })
    })
  }
}

export const setUserContext = (user) => {
  if (typeof window !== 'undefined') {
    import('@sentry/nextjs').then(Sentry => {
      Sentry.setUser({
        id: user.id,
        userType: user.user_type,
        // Don't include email or other PII
      })
    })
  }
}