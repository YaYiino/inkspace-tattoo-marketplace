/**
 * Production logging system for Antsss Tattoo Marketplace
 * Provides structured logging with multiple outputs and error tracking
 */

interface LogLevel {
  DEBUG: 0
  INFO: 1
  WARN: 2
  ERROR: 3
  CRITICAL: 4
}

interface LogEntry {
  timestamp: string
  level: keyof LogLevel
  message: string
  context?: Record<string, any>
  requestId?: string
  userId?: string
  error?: Error
  duration?: number
}

class ProductionLogger {
  private logLevel: number
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.logLevel = this.getLogLevel()
  }

  private getLogLevel(): number {
    const level = process.env.LOG_LEVEL?.toLowerCase()
    switch (level) {
      case 'debug': return 0
      case 'info': return 1
      case 'warn': return 2
      case 'error': return 3
      case 'critical': return 4
      default: return this.isProduction ? 1 : 0 // INFO for prod, DEBUG for dev
    }
  }

  private shouldLog(level: keyof LogLevel): boolean {
    const levels: LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 }
    return levels[level] >= this.logLevel
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, requestId, userId, duration } = entry
    
    const logObject = {
      timestamp,
      level,
      message,
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(duration && { duration: `${duration}ms` }),
      ...(context && { context }),
    }

    return this.isProduction ? JSON.stringify(logObject) : this.formatDevLog(entry)
  }

  private formatDevLog(entry: LogEntry): string {
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      CRITICAL: '\x1b[35m' // Magenta
    }
    const reset = '\x1b[0m'
    const color = colors[entry.level] || colors.INFO

    let output = `${color}[${entry.level}]${reset} ${entry.message}`
    
    if (entry.requestId) {
      output += ` (req: ${entry.requestId.slice(0, 8)})`
    }
    
    if (entry.duration) {
      output += ` (${entry.duration}ms)`
    }
    
    if (entry.context) {
      output += `\n${JSON.stringify(entry.context, null, 2)}`
    }

    return output
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    const formattedLog = this.formatLog(entry)
    
    // In production, write to stdout/stderr for proper log aggregation
    if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
      console.error(formattedLog)
      
      // Send to external error tracking in production
      if (this.isProduction && entry.error) {
        this.sendToSentry(entry)
      }
    } else {
      console.log(formattedLog)
    }

    // Send to external logging service in production
    if (this.isProduction) {
      this.sendToExternalLogger(entry)
    }
  }

  private async sendToSentry(entry: LogEntry): Promise<void> {
    try {
      if (typeof window === 'undefined' && entry.error) {
        // Server-side Sentry logging
        const Sentry = await import('@sentry/nextjs')
        Sentry.captureException(entry.error, {
          level: entry.level.toLowerCase() as any,
          tags: {
            requestId: entry.requestId,
            userId: entry.userId,
          },
          extra: entry.context
        })
      }
    } catch (error) {
      console.error('Failed to send error to Sentry:', error)
    }
  }

  private sendToExternalLogger(entry: LogEntry): void {
    // In production, you might want to send logs to external services
    // like DataDog, LogRocket, or custom logging endpoints
    if (process.env.LOG_WEBHOOK_URL) {
      fetch(process.env.LOG_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }).catch(() => {
        // Silently fail to avoid infinite loops
      })
    }
  }

  // Public logging methods
  debug(message: string, context?: Record<string, any>, requestId?: string): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      context,
      requestId
    })
  }

  info(message: string, context?: Record<string, any>, requestId?: string): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
      requestId
    })
  }

  warn(message: string, context?: Record<string, any>, requestId?: string): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
      requestId
    })
  }

  error(message: string, error?: Error, context?: Record<string, any>, requestId?: string): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error,
      context,
      requestId
    })
  }

  critical(message: string, error?: Error, context?: Record<string, any>, requestId?: string): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      message,
      error,
      context,
      requestId
    })
  }

  // Special logging methods for common use cases
  apiRequest(
    method: string, 
    path: string, 
    statusCode: number, 
    duration: number, 
    metadata?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? 'ERROR' : 'INFO'
    this.writeLog({
      timestamp: new Date().toISOString(),
      level,
      message: `${method} ${path} ${statusCode}`,
      duration,
      context: {
        method,
        path,
        statusCode,
        ...metadata
      },
      requestId: metadata?.requestId
    })
  }

  userAction(
    action: string, 
    userId: string, 
    success: boolean, 
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: success ? 'INFO' : 'WARN',
      message: `User ${action} ${success ? 'succeeded' : 'failed'}`,
      userId,
      context: {
        action,
        success,
        ...metadata
      },
      requestId
    })
  }

  businessMetric(
    metric: string, 
    value: number | string, 
    tags?: Record<string, any>
  ): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `Business metric: ${metric}`,
      context: {
        metric,
        value,
        tags
      }
    })
  }

  securityEvent(
    event: string, 
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>,
    requestId?: string
  ): void {
    const level = severity === 'CRITICAL' ? 'CRITICAL' : 
                 severity === 'HIGH' ? 'ERROR' : 'WARN'
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level,
      message: `Security event: ${event}`,
      context: {
        event,
        severity,
        ...details
      },
      requestId
    })
  }

  performance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    const level = duration > 5000 ? 'WARN' : 'DEBUG'
    
    this.writeLog({
      timestamp: new Date().toISOString(),
      level,
      message: `Performance: ${operation}`,
      duration,
      context: {
        operation,
        ...metadata
      },
      requestId
    })
  }
}

// Export singleton instance
export const logger = new ProductionLogger()

// Export structured logging helpers
export const createContextualLogger = (defaultContext: Record<string, any>) => {
  return {
    debug: (message: string, additionalContext?: Record<string, any>, requestId?: string) =>
      logger.debug(message, { ...defaultContext, ...additionalContext }, requestId),
    
    info: (message: string, additionalContext?: Record<string, any>, requestId?: string) =>
      logger.info(message, { ...defaultContext, ...additionalContext }, requestId),
    
    warn: (message: string, additionalContext?: Record<string, any>, requestId?: string) =>
      logger.warn(message, { ...defaultContext, ...additionalContext }, requestId),
    
    error: (message: string, error?: Error, additionalContext?: Record<string, any>, requestId?: string) =>
      logger.error(message, error, { ...defaultContext, ...additionalContext }, requestId),
  }
}

export type Logger = typeof logger