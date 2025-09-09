import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Performance monitoring
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Session tracking
      autoSessionTracking: true,
      
      // Additional configuration
      beforeSend(event, hint) {
        // Filter out non-critical errors in development
        if (process.env.NODE_ENV === 'development') {
          const error = hint.originalException
          
          // Skip common development errors
          if (error instanceof Error) {
            if (error.message.includes('ResizeObserver loop limit exceeded') ||
                error.message.includes('Non-Error promise rejection captured') ||
                error.message.includes('Script error.')) {
              return null
            }
          }
        }
        
        return event
      },
      
      // Configure integrations
      integrations: [
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.nextRouterInstrumentation,
        }),
      ],
      
      // Configure tags
      initialScope: {
        tags: {
          component: 'antsss-tattoo-marketplace',
        },
      },
    })
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: context ? { additional: context } : undefined,
  })
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user)
}

export function setContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context)
}

export function addBreadcrumb(breadcrumb: {
  message: string
  category?: string
  level?: Sentry.SeverityLevel
  data?: Record<string, any>
}) {
  Sentry.addBreadcrumb(breadcrumb)
}

export { Sentry }