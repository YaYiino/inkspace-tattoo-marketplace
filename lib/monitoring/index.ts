// Main monitoring initialization and configuration
import { enhancedLogger } from './enhanced-logger'
import { analytics } from './analytics'
import { initSentry } from './sentry'
import { performanceMonitor } from './performance'
import { sessionRecorder, identifyUser } from './session-recording'
import { errorCategorization } from './error-categorization'

export interface MonitoringConfig {
  enableSentry: boolean
  enableAnalytics: boolean
  enablePerformanceMonitoring: boolean
  enableSessionRecording: boolean
  enableErrorCategorization: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  environment: string
  userId?: string
  userEmail?: string
  sessionRecordingSampleRate?: number
}

class MonitoringService {
  private static instance: MonitoringService
  private config: MonitoringConfig
  private initialized: boolean = false

  private constructor() {
    this.config = this.getDefaultConfig()
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  private getDefaultConfig(): MonitoringConfig {
    return {
      enableSentry: !!process.env.SENTRY_DSN,
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enablePerformanceMonitoring: true,
      enableSessionRecording: process.env.NODE_ENV === 'production',
      enableErrorCategorization: true,
      logLevel: (process.env.LOG_LEVEL as MonitoringConfig['logLevel']) || 'info',
      environment: process.env.NODE_ENV || 'development',
      sessionRecordingSampleRate: parseFloat(process.env.NEXT_PUBLIC_SESSION_RECORDING_SAMPLE_RATE || '0.1'),
    }
  }

  public async initialize(customConfig?: Partial<MonitoringConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('Monitoring service already initialized')
      return
    }

    this.config = { ...this.config, ...customConfig }

    try {
      // Initialize Sentry
      if (this.config.enableSentry) {
        initSentry()
        enhancedLogger.logBusinessEvent('sentry_initialized', {
          environment: this.config.environment,
        })
      }

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        // Performance monitor is already initialized as singleton
        enhancedLogger.logBusinessEvent('performance_monitoring_initialized', {
          environment: this.config.environment,
        })
      }

      // Initialize session recording
      if (this.config.enableSessionRecording && typeof window !== 'undefined') {
        // Session recorder is already initialized as singleton
        enhancedLogger.logBusinessEvent('session_recording_initialized', {
          sampleRate: this.config.sessionRecordingSampleRate,
        })
      }

      // Set user context if available
      if (this.config.userId) {
        this.setUser(this.config.userId, this.config.userEmail)
      }

      this.initialized = true
      
      enhancedLogger.logBusinessEvent('monitoring_service_initialized', {
        config: {
          enableSentry: this.config.enableSentry,
          enableAnalytics: this.config.enableAnalytics,
          enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
          enableSessionRecording: this.config.enableSessionRecording,
          environment: this.config.environment,
        },
      })

    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'external',
        {
          context: { message: 'Failed to initialize monitoring service' },
          tags: { initialization_error: 'true' },
        }
      )
      throw error
    }
  }

  public setUser(userId: string, email?: string, username?: string): void {
    enhancedLogger.setUser(userId, email, username)
    
    if (this.config.enableAnalytics) {
      analytics.setUserId(userId)
      if (email || username) {
        analytics.setUserProperties({ email, username })
      }
    }

    if (this.config.enableSessionRecording) {
      identifyUser(userId)
    }

    enhancedLogger.logBusinessEvent('user_identified', { userId })
  }

  public logError(
    error: Error,
    category: 'api' | 'ui' | 'auth' | 'database' | 'external' | 'validation' | 'performance' | 'security',
    context?: Record<string, any>,
    userId?: string
  ): void {
    // Log the error
    enhancedLogger.logError(error, category, { context })

    // Categorize the error for management
    if (this.config.enableErrorCategorization) {
      errorCategorization.categorizeError(error, { category, ...context }, userId)
    }
  }

  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (this.config.enableAnalytics) {
      analytics.track({
        name: eventName,
        properties,
      })
    }
  }

  public trackPerformance(metricName: string, value: number, unit?: string): void {
    enhancedLogger.logPerformance({
      name: metricName,
      value,
      unit,
    })

    if (this.config.enableAnalytics) {
      analytics.performanceMetric(metricName, value, { unit })
    }
  }

  public getErrorStats(): Record<string, any> {
    if (!this.config.enableErrorCategorization) {
      return { message: 'Error categorization is disabled' }
    }
    return errorCategorization.getErrorStats()
  }

  public isInitialized(): boolean {
    return this.initialized
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance()

// Export convenience functions
export const logError = (
  error: Error,
  category: Parameters<MonitoringService['logError']>[1],
  context?: Record<string, any>,
  userId?: string
) => monitoring.logError(error, category, context, userId)

export const trackEvent = (eventName: string, properties?: Record<string, any>) => 
  monitoring.trackEvent(eventName, properties)

export const trackPerformance = (metricName: string, value: number, unit?: string) =>
  monitoring.trackPerformance(metricName, value, unit)

export const setUser = (userId: string, email?: string, username?: string) =>
  monitoring.setUser(userId, email, username)

// Re-export everything for convenience
export { enhancedLogger } from './enhanced-logger'
export { analytics } from './analytics'
export { performanceMonitor } from './performance'
export { sessionRecorder } from './session-recording'
export { errorCategorization } from './error-categorization'

// Error handling utilities
export {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  withErrorHandler,
  validateRequired,
  isOperationalError,
} from '../errors/api-error-handler'

// React error utilities
export {
  ErrorBoundary,
  GlobalErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
} from '../errors/ErrorBoundary'

export {
  useAsyncError,
  useFormError,
  useApiError,
  useGlobalErrorHandler,
  usePerformanceMonitoring,
  useUserSessionMonitoring,
  useRetry,
} from '../errors/hooks'

// Toast notifications
export {
  ToastProvider,
  useToast,
  type Toast,
  type ToastType,
} from '../notifications/toast'

// Development tools
export {
  ErrorDebugger,
  decodeSourceMapError,
  devPerformance,
} from '../errors/dev-tools'

// Types
export type { MonitoringConfig } from './index'
export type { PerformanceMetric, SecurityEvent } from './enhanced-logger'
export type { ErrorCategory, CategorizedError } from './error-categorization'
export type { LogEntry } from './logger'