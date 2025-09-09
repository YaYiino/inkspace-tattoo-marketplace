import { NextRequest, NextResponse } from 'next/server'
import { enhancedLogger } from '@/lib/monitoring/enhanced-logger'
import { captureError } from '@/lib/monitoring/sentry'

export class ApiError extends Error {
  public statusCode: number
  public code: string
  public details?: any
  public isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = isOperational

    // Maintain proper stack trace
    Error.captureStackTrace(this, ApiError)
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends ApiError {
  constructor(service: string, message: string, originalError?: Error) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message,
    })
    this.name = 'ExternalServiceError'
  }
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
    requestId?: string
  }
  meta?: {
    requestId: string
    timestamp: string
    version: string
  }
}

type ApiHandler<T = any> = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<T>

// Middleware wrapper for API routes
export function withErrorHandler<T = any>(handler: ApiHandler<T>) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    const method = request.method
    const url = request.url
    const userAgent = request.headers.get('user-agent') || undefined

    // Set request context for logging
    enhancedLogger.setRequestContext(requestId, method, url, userAgent)

    try {
      // Execute the handler
      const result = await handler(request, context)
      const duration = Date.now() - startTime

      // Log successful API call
      enhancedLogger.logApiCall(method, url, 200, duration, {
        requestBody: await getRequestBody(request),
        responseBody: result,
      })

      // Return successful response
      const response: ApiResponse<T> = {
        success: true,
        data: result,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
        },
      }

      return NextResponse.json(response, { status: 200 })

    } catch (error) {
      const duration = Date.now() - startTime
      return handleApiError(error, {
        requestId,
        method,
        url,
        duration,
        userAgent,
        requestBody: await getRequestBody(request),
      })
    }
  }
}

// Error handler function
export function handleApiError(
  error: unknown,
  context: {
    requestId: string
    method: string
    url: string
    duration: number
    userAgent?: string
    requestBody?: any
  }
): NextResponse {
  let apiError: ApiError

  // Convert different error types to ApiError
  if (error instanceof ApiError) {
    apiError = error
  } else if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('SUPABASE')) {
      apiError = new ApiError('Database operation failed', 500, 'DATABASE_ERROR')
    } else if (error.message.includes('fetch')) {
      apiError = new ExternalServiceError('External API', error.message, error)
    } else {
      apiError = new ApiError(
        process.env.NODE_ENV === 'production' 
          ? 'An internal error occurred' 
          : error.message,
        500,
        'INTERNAL_ERROR'
      )
    }
  } else {
    apiError = new ApiError('Unknown error occurred', 500, 'UNKNOWN_ERROR')
  }

  // Log the error
  enhancedLogger.logApiCall(
    context.method,
    context.url,
    apiError.statusCode,
    context.duration,
    {
      error: apiError,
      requestBody: context.requestBody,
    }
  )

  // Create error response
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      requestId: context.requestId,
    },
    meta: {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
    },
  }

  // Add additional headers for certain error types
  const headers: HeadersInit = {}
  
  if (apiError instanceof RateLimitError && apiError.details?.retryAfter) {
    headers['Retry-After'] = apiError.details.retryAfter.toString()
  }

  if (apiError instanceof AuthenticationError) {
    headers['WWW-Authenticate'] = 'Bearer'
  }

  return NextResponse.json(errorResponse, {
    status: apiError.statusCode,
    headers,
  })
}

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function getRequestBody(request: NextRequest): Promise<any> {
  if (!request.body || request.method === 'GET') {
    return undefined
  }

  try {
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await request.json()
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      return Object.fromEntries(formData.entries())
    }
  } catch (error) {
    // Return undefined if we can't parse the body
    return undefined
  }
  
  return undefined
}

// Validation helper
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }
}

// Type guard for operational errors
export function isOperationalError(error: Error): boolean {
  return error instanceof ApiError && error.isOperational
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    enhancedLogger.logError(
      reason instanceof Error ? reason : new Error(String(reason)),
      'api',
      {
        context: {
          type: 'unhandled_promise_rejection',
          promise: promise.toString(),
        },
        tags: {
          error_type: 'unhandled_rejection',
        },
      }
    )

    // In production, we might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.error('Unhandled promise rejection:', reason)
      process.exit(1)
    }
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    enhancedLogger.logError(error, 'api', {
      context: {
        type: 'uncaught_exception',
      },
      tags: {
        error_type: 'uncaught_exception',
      },
    })

    console.error('Uncaught exception:', error)
    process.exit(1)
  })
}

// Export all error classes for convenience
export {
  ApiError as default,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
}