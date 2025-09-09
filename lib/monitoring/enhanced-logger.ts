import { logger as baseLogger } from './logger'
import { analytics } from './analytics'
import { captureError, captureMessage, addBreadcrumb, setContext } from './sentry'

interface EnhancedLogOptions {
  context?: Record<string, any>
  tags?: Record<string, string>
  fingerprint?: string[]
  extra?: Record<string, any>
  user?: {
    id: string
    email?: string
    username?: string
  }
}

interface PerformanceMetric {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
}

interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'input_validation' | 'rate_limiting' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, any>
  userId?: string
  ip?: string
  userAgent?: string
}

class EnhancedLogger {
  private static instance: EnhancedLogger
  private requestId?: string
  private userId?: string
  private sessionId?: string

  private constructor() {
    this.initializeSession()
  }

  static getInstance(): EnhancedLogger {
    if (!EnhancedLogger.instance) {
      EnhancedLogger.instance = new EnhancedLogger()
    }
    return EnhancedLogger.instance
  }

  private initializeSession() {
    if (typeof window !== 'undefined') {
      this.sessionId = this.generateSessionId()
      this.requestId = this.generateRequestId()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUser(userId: string, email?: string, username?: string) {
    this.userId = userId
    setContext('user', { id: userId, email, username })
  }

  setRequestContext(requestId: string, method: string, path: string, userAgent?: string) {
    this.requestId = requestId
    setContext('request', {
      id: requestId,
      method,
      path,
      userAgent,
      timestamp: new Date().toISOString(),
    })
  }

  // Enhanced error logging with categorization
  logError(
    error: Error | string,
    category: 'api' | 'ui' | 'auth' | 'database' | 'external' | 'validation' | 'performance' | 'security',
    options: EnhancedLogOptions = {}
  ) {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    const severity = this.categorizeSeverity(category, errorObj)

    // Add breadcrumb for error tracking
    addBreadcrumb({
      message: `Error in ${category}`,
      category: 'error',
      level: severity,
      data: {
        errorName: errorObj.name,
        errorMessage: errorObj.message,
        ...options.context,
      },
    })

    // Set additional context
    if (options.context) {
      setContext('errorContext', options.context)
    }

    // Log to base logger
    baseLogger.error(`[${category.toUpperCase()}] ${errorObj.message}`, errorObj, {
      category,
      severity,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ...options.context,
    })

    // Send to Sentry with enhanced context
    captureError(errorObj, {
      category,
      severity,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      fingerprint: options.fingerprint,
      tags: {
        category,
        severity,
        ...options.tags,
      },
      extra: options.extra,
      ...options.context,
    })

    // Track in analytics
    analytics.errorOccurred(errorObj, {
      category,
      severity,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ...options.context,
    })
  }

  // Performance monitoring
  logPerformance(metric: PerformanceMetric) {
    const logLevel = metric.value > this.getPerformanceThreshold(metric.name) ? 'warn' : 'info'

    baseLogger[logLevel](`Performance: ${metric.name}`, undefined, {
      type: 'performance',
      metric: metric.name,
      value: metric.value,
      unit: metric.unit || 'ms',
      tags: metric.tags,
      requestId: this.requestId,
      userId: this.userId,
    })

    // Track performance in analytics
    analytics.performanceMetric(metric.name, metric.value, {
      unit: metric.unit,
      tags: metric.tags,
      requestId: this.requestId,
    })

    // Alert on poor performance
    if (metric.value > this.getPerformanceThreshold(metric.name)) {
      this.logError(
        new Error(`Poor performance detected: ${metric.name} took ${metric.value}${metric.unit || 'ms'}`),
        'performance',
        {
          context: {
            metric: metric.name,
            value: metric.value,
            threshold: this.getPerformanceThreshold(metric.name),
          },
          tags: { performance_alert: 'true', ...metric.tags },
        }
      )
    }
  }

  // Security event logging
  logSecurityEvent(event: SecurityEvent) {
    const logLevel = this.getSecurityLogLevel(event.severity)

    baseLogger[logLevel](`Security: ${event.type}`, undefined, {
      type: 'security',
      eventType: event.type,
      severity: event.severity,
      details: event.details,
      userId: event.userId || this.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: this.requestId,
    })

    // Add security breadcrumb
    addBreadcrumb({
      message: `Security event: ${event.type}`,
      category: 'security',
      level: event.severity === 'critical' ? 'error' : 'warning',
      data: {
        eventType: event.type,
        severity: event.severity,
        userId: event.userId,
      },
    })

    // Send critical security events to Sentry
    if (['high', 'critical'].includes(event.severity)) {
      captureMessage(`Security alert: ${event.type}`, 'error')
    }

    // Track security events in analytics
    analytics.track({
      name: 'security_event',
      properties: {
        type: event.type,
        severity: event.severity,
        details: event.details,
        userId: event.userId,
        ip: event.ip,
      },
    })
  }

  // Business event logging
  logBusinessEvent(
    eventName: string,
    data: Record<string, any>,
    importance: 'low' | 'medium' | 'high' = 'medium'
  ) {
    baseLogger.business(eventName, {
      importance,
      data,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
    })

    // Track business events in analytics
    analytics.track({
      name: eventName.toLowerCase().replace(/\s+/g, '_'),
      properties: {
        ...data,
        importance,
        requestId: this.requestId,
      },
    })
  }

  // API request/response logging
  logApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    options: {
      requestBody?: any
      responseBody?: any
      error?: Error
      userId?: string
    } = {}
  ) {
    const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info'

    baseLogger.apiRequest(method, endpoint, statusCode, duration, {
      requestId: this.requestId,
      userId: options.userId || this.userId,
      sessionId: this.sessionId,
      hasError: !!options.error,
      ...(process.env.NODE_ENV === 'development' && {
        requestBody: options.requestBody,
        responseBody: options.responseBody,
      }),
    })

    // Track API calls in analytics
    analytics.track({
      name: 'api_call',
      properties: {
        method,
        endpoint,
        statusCode,
        duration,
        success: statusCode < 400,
        requestId: this.requestId,
      },
    })

    // Log API errors separately
    if (options.error && statusCode >= 400) {
      this.logError(options.error, 'api', {
        context: {
          method,
          endpoint,
          statusCode,
          duration,
        },
        tags: {
          api_endpoint: endpoint,
          http_method: method,
          status_code: statusCode.toString(),
        },
      })
    }
  }

  // User action logging
  logUserAction(
    action: string,
    details: Record<string, any> = {},
    userId?: string
  ) {
    baseLogger.userAction(action, userId || this.userId!, {
      details,
      requestId: this.requestId,
      sessionId: this.sessionId,
    })

    // Track user actions in analytics
    analytics.track({
      name: `user_${action.toLowerCase().replace(/\s+/g, '_')}`,
      properties: {
        ...details,
        requestId: this.requestId,
      },
    })
  }

  // Feature usage tracking
  logFeatureUsage(
    featureName: string,
    context: Record<string, any> = {}
  ) {
    baseLogger.info(`Feature used: ${featureName}`, undefined, {
      type: 'feature_usage',
      feature: featureName,
      context,
      userId: this.userId,
      requestId: this.requestId,
    })

    analytics.featureUsed(featureName, {
      ...context,
      requestId: this.requestId,
    })
  }

  // Database operation logging
  logDatabaseOperation(
    operation: 'create' | 'read' | 'update' | 'delete',
    table: string,
    duration: number,
    recordCount?: number,
    error?: Error
  ) {
    const logLevel = error ? 'error' : duration > 1000 ? 'warn' : 'info'

    baseLogger[logLevel](`DB ${operation.toUpperCase()}: ${table}`, error, {
      type: 'database',
      operation,
      table,
      duration,
      recordCount,
      requestId: this.requestId,
      userId: this.userId,
    })

    if (error) {
      this.logError(error, 'database', {
        context: {
          operation,
          table,
          duration,
          recordCount,
        },
        tags: {
          db_operation: operation,
          db_table: table,
        },
      })
    }
  }

  private categorizeSeverity(category: string, error: Error): 'debug' | 'info' | 'warn' | 'error' {
    // Critical categories always error
    if (['security', 'auth', 'database'].includes(category)) {
      return 'error'
    }

    // Check error type/message for severity hints
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return 'warn'
    }

    if (error.name === 'ValidationError') {
      return 'warn'
    }

    return 'error'
  }

  private getPerformanceThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'api_response_time': 1000,
      'database_query_time': 500,
      'page_load_time': 3000,
      'first_contentful_paint': 2000,
      'largest_contentful_paint': 2500,
      'first_input_delay': 100,
      'cumulative_layout_shift': 0.1,
    }
    return thresholds[metricName] || 1000
  }

  private getSecurityLogLevel(severity: SecurityEvent['severity']): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'high':
        return 'error'
      case 'medium':
        return 'warn'
      case 'low':
        return 'info'
      default:
        return 'info'
    }
  }

  // Cleanup method for session end
  endSession() {
    if (this.sessionId) {
      baseLogger.info('Session ended', undefined, {
        type: 'session',
        sessionId: this.sessionId,
        userId: this.userId,
        duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      })
    }
  }
}

export const enhancedLogger = EnhancedLogger.getInstance()
export type { PerformanceMetric, SecurityEvent, EnhancedLogOptions }