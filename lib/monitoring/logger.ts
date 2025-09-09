interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: Record<string, any>
  timestamp: string
  requestId?: string
  userId?: string
  path?: string
  userAgent?: string
}

class Logger {
  private static instance: Logger
  private logLevel: string

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info'
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry)
    }

    // Pretty format for development
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const level = entry.level.toUpperCase().padEnd(5)
    let message = `[${timestamp}] ${level} ${entry.message}`

    if (entry.metadata) {
      message += ` ${JSON.stringify(entry.metadata)}`
    }

    return message
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      requestId: this.getRequestId(),
      userId: this.getUserId(),
      path: this.getCurrentPath(),
      userAgent: this.getUserAgent(),
    }
  }

  private getRequestId(): string | undefined {
    // In a real app, this would come from request context
    return typeof window === 'undefined' 
      ? process.env.REQUEST_ID 
      : undefined
  }

  private getUserId(): string | undefined {
    // In a real app, this would come from auth context
    return typeof window === 'undefined' 
      ? process.env.USER_ID 
      : undefined
  }

  private getCurrentPath(): string | undefined {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return process.env.REQUEST_PATH
  }

  private getUserAgent(): string | undefined {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent
    }
    return process.env.USER_AGENT
  }

  private async persistLog(entry: LogEntry) {
    if (process.env.NODE_ENV === 'production') {
      try {
        // Send to external logging service (e.g., Sentry, LogRocket, etc.)
        if (process.env.SENTRY_DSN && entry.level === 'error') {
          // Send error to Sentry
          const { captureException } = await import('@sentry/nextjs')
          captureException(new Error(entry.message), {
            contexts: {
              log: entry.metadata
            },
            user: entry.userId ? { id: entry.userId } : undefined,
            tags: {
              level: entry.level,
              path: entry.path
            }
          })
        }

        // Send to structured logging service
        if (process.env.LOG_WEBHOOK_URL) {
          fetch(process.env.LOG_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          }).catch(console.error)
        }

        // Store in database for development
        if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
          // Store in local database for development debugging
        }

      } catch (error) {
        console.error('Failed to persist log:', error)
      }
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog('debug')) return

    const entry = this.createLogEntry('debug', message, metadata)
    console.debug(this.formatMessage(entry))
    this.persistLog(entry)
  }

  info(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog('info')) return

    const entry = this.createLogEntry('info', message, metadata)
    console.info(this.formatMessage(entry))
    this.persistLog(entry)
  }

  warn(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog('warn')) return

    const entry = this.createLogEntry('warn', message, metadata)
    console.warn(this.formatMessage(entry))
    this.persistLog(entry)
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, any>) {
    if (!this.shouldLog('error')) return

    const errorMetadata = {
      ...metadata,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      })
    }

    const entry = this.createLogEntry('error', message, errorMetadata)
    console.error(this.formatMessage(entry))
    this.persistLog(entry)
  }

  // Convenience methods for common scenarios
  apiRequest(method: string, path: string, statusCode: number, duration: number, metadata?: Record<string, any>) {
    this.info('API Request', {
      method,
      path,
      statusCode,
      duration,
      ...metadata
    })
  }

  userAction(action: string, userId: string, metadata?: Record<string, any>) {
    this.info('User Action', {
      action,
      userId,
      ...metadata
    })
  }

  performance(operation: string, duration: number, metadata?: Record<string, any>) {
    const level = duration > 1000 ? 'warn' : 'info'
    this[level]('Performance Metric', {
      operation,
      duration,
      ...metadata
    })
  }

  security(event: string, metadata?: Record<string, any>) {
    this.warn('Security Event', {
      event,
      ...metadata
    })
  }

  business(event: string, metadata?: Record<string, any>) {
    this.info('Business Event', {
      event,
      ...metadata
    })
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export types for TypeScript
export type { LogEntry }