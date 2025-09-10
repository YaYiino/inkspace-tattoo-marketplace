// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.

import { init } from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

init({
  dsn: SENTRY_DSN,
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Server-side performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  tracePropagationTargets: [
    'localhost',
    'antsss.com',
    /^https:\/\/.*\.supabase\.co\/rest\/v1/,
    /^https:\/\/.*\.supabase\.co\/auth\/v1/,
  ],

  // Data sanitization for server-side
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
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
        delete event.request.headers['x-supabase-auth']
      }

      // Remove sensitive environment variables from context
      if (event.contexts && event.contexts.runtime && event.contexts.runtime.env) {
        const sensitiveEnvVars = [
          'SUPABASE_SERVICE_ROLE_KEY',
          'NEXTAUTH_SECRET',
          'JWT_SECRET',
          'SENTRY_AUTH_TOKEN',
          'SMTP_PASS',
          'GOOGLE_CLIENT_SECRET'
        ]
        sensitiveEnvVars.forEach(envVar => {
          if (event.contexts.runtime.env[envVar]) {
            event.contexts.runtime.env[envVar] = '***'
          }
        })
      }
    }

    // Don't send events for known non-critical errors
    const ignoredErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'AbortError',
      'Network request failed'
    ]

    if (event.exception) {
      const errorMessage = event.exception.values?.[0]?.value || ''
      const errorType = event.exception.values?.[0]?.type || ''
      
      if (ignoredErrors.some(ignored => 
        errorMessage.includes(ignored) || errorType.includes(ignored)
      )) {
        return null
      }
    }

    // Rate limit error reporting to prevent spam
    if (event.exception && event.fingerprint) {
      const errorFingerprint = event.fingerprint.join('-')
      const now = Date.now()
      
      // Simple in-memory rate limiting (in production, use Redis)
      if (global.sentryRateLimit && global.sentryRateLimit[errorFingerprint]) {
        const lastSent = global.sentryRateLimit[errorFingerprint]
        if (now - lastSent < 60000) { // 1 minute cooldown
          return null
        }
      }
      
      if (!global.sentryRateLimit) {
        global.sentryRateLimit = {}
      }
      global.sentryRateLimit[errorFingerprint] = now
    }

    return event
  },

  // Enhanced server-side breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Don't log sensitive console messages
    if (breadcrumb.category === 'console') {
      const message = breadcrumb.message || ''
      const sensitivePatterns = ['password', 'token', 'secret', 'key', 'auth']
      
      if (sensitivePatterns.some(pattern => 
        message.toLowerCase().includes(pattern)
      )) {
        return null
      }
    }

    // Add server context to HTTP breadcrumbs
    if (breadcrumb.category === 'http') {
      breadcrumb.data = {
        ...breadcrumb.data,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        // Don't include full URL if it contains sensitive data
        url: breadcrumb.data?.url?.replace(/([?&])(token|key|secret|password)=[^&]*/gi, '$1$2=***')
      }
    }

    return breadcrumb
  },

  // Custom error tags for server-side
  initialScope: {
    tags: {
      component: 'server',
      runtime: 'nodejs',
      platform: process.platform,
      nodeVersion: process.version,
    },
    context: {
      app: {
        name: 'antsss-tattoo-marketplace',
        version: process.env.NEXT_PUBLIC_APP_VERSION,
        build: process.env.NEXT_PUBLIC_BUILD_ID,
      },
      server: {
        platform: process.platform,
        nodeVersion: process.version,
        architecture: process.arch,
      }
    }
  },

  // Development settings
  debug: process.env.NODE_ENV !== 'production',

  // Disable automatic performance instrumentation for certain operations
  integrations: [
    // You can add custom integrations here
  ],

  // Custom sampling for different types of transactions
  tracesSampler: (samplingContext) => {
    // Sample health checks less frequently
    if (samplingContext.transactionContext.name?.includes('/api/health')) {
      return 0.01 // 1% sampling for health checks
    }

    // Sample authentication routes more frequently
    if (samplingContext.transactionContext.name?.includes('/api/auth')) {
      return process.env.NODE_ENV === 'production' ? 0.5 : 1.0
    }

    // Default sampling rate
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  },
})

// Export server-side error reporting helpers
export const captureServerError = (error, context = {}) => {
  return import('@sentry/nextjs').then(Sentry => {
    return Sentry.withScope(scope => {
      // Add server-specific context
      scope.setContext('server', {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        ...context
      })
      
      return Sentry.captureException(error)
    })
  })
}

export const captureServerMessage = (message, level = 'info', context = {}) => {
  return import('@sentry/nextjs').then(Sentry => {
    return Sentry.withScope(scope => {
      scope.setLevel(level)
      scope.setContext('server', {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version,
        ...context
      })
      
      return Sentry.captureMessage(message)
    })
  })
}

export const addServerBreadcrumb = (message, category = 'custom', data = {}) => {
  return import('@sentry/nextjs').then(Sentry => {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      timestamp: Date.now() / 1000,
      data: {
        server: true,
        nodeVersion: process.version,
        ...data
      }
    })
  })
}