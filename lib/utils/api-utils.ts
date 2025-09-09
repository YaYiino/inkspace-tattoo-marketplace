// Utility functions for API integration with error handling
import { NextRequest } from 'next/server'
import { 
  withErrorHandler, 
  ValidationError, 
  AuthenticationError,
  NotFoundError,
  validateRequired 
} from '@/lib/errors/api-error-handler'
import { enhancedLogger } from '@/lib/monitoring/enhanced-logger'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Wrapper for API routes with authentication
export function withAuth<T>(
  handler: (request: NextRequest, context: any, user: any) => Promise<T>
) {
  return withErrorHandler(async (request: NextRequest, context?: any) => {
    // Get user from Supabase
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new AuthenticationError('Authentication required')
    }

    // Log authenticated request
    enhancedLogger.logApiCall(
      request.method,
      request.url,
      200,
      0,
      { userId: user.id }
    )

    return handler(request, context, user)
  })
}

// Wrapper for admin-only API routes
export function withAdmin<T>(
  handler: (request: NextRequest, context: any, user: any) => Promise<T>
) {
  return withAuth(async (request: NextRequest, context: any, user: any) => {
    // Check if user is admin (adjust based on your user model)
    const isAdmin = user.user_metadata?.role === 'admin' || user.email?.endsWith('@antsss.com')
    
    if (!isAdmin) {
      enhancedLogger.logSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        details: {
          action: 'admin_route_access_denied',
          userId: user.id,
          route: request.url,
        },
        userId: user.id,
      })
      
      throw new AuthenticationError('Admin access required')
    }

    return handler(request, context, user)
  })
}

// Wrapper for API routes with rate limiting
export function withRateLimit<T>(
  handler: (request: NextRequest, context?: any) => Promise<T>,
  options: {
    maxRequests: number
    windowMs: number
    keyGenerator?: (request: NextRequest) => string
  }
) {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return withErrorHandler(async (request: NextRequest, context?: any) => {
    const key = options.keyGenerator 
      ? options.keyGenerator(request)
      : request.headers.get('x-forwarded-for') || 'anonymous'
    
    const now = Date.now()
    const record = requests.get(key)
    
    if (!record || now > record.resetTime) {
      requests.set(key, { count: 1, resetTime: now + options.windowMs })
    } else if (record.count >= options.maxRequests) {
      enhancedLogger.logSecurityEvent({
        type: 'rate_limiting',
        severity: 'medium',
        details: {
          key,
          maxRequests: options.maxRequests,
          windowMs: options.windowMs,
        },
      })
      
      const { RateLimitError } = await import('@/lib/errors/api-error-handler')
      throw new RateLimitError(
        'Rate limit exceeded',
        Math.ceil((record.resetTime - now) / 1000)
      )
    } else {
      record.count++
    }

    return handler(request, context)
  })
}

// Validation helper with enhanced error reporting
export function validateRequestBody<T extends Record<string, any>>(
  body: any,
  requiredFields: (keyof T)[],
  optionalFields: (keyof T)[] = []
): T {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object')
  }

  // Check required fields
  validateRequired(body, requiredFields)

  // Check for unknown fields
  const allowedFields = new Set([...requiredFields, ...optionalFields])
  const unknownFields = Object.keys(body).filter(field => !allowedFields.has(field))
  
  if (unknownFields.length > 0) {
    throw new ValidationError(
      `Unknown fields: ${unknownFields.join(', ')}`,
      { unknownFields }
    )
  }

  return body as T
}

// Database operation wrapper with error handling
export async function withDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationType: 'create' | 'read' | 'update' | 'delete',
  tableName: string
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    enhancedLogger.logDatabaseOperation(operationType, tableName, duration)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    enhancedLogger.logDatabaseOperation(
      operationType, 
      tableName, 
      duration, 
      undefined, 
      error as Error
    )
    throw error
  }
}

// Pagination helper
export function getPaginationParams(request: NextRequest): {
  page: number
  limit: number
  offset: number
} {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

// Search/filter helper
export function parseFilters(request: NextRequest): Record<string, string> {
  const url = new URL(request.url)
  const filters: Record<string, string> = {}
  
  for (const [key, value] of url.searchParams.entries()) {
    if (!['page', 'limit', 'sort', 'order'].includes(key)) {
      filters[key] = value
    }
  }
  
  return filters
}

// Response helper with consistent format
export function createApiResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
) {
  return {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

// File upload validation
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): void {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options

  if (file.size > maxSize) {
    throw new ValidationError(
      `File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
      { fileSize: file.size, maxSize }
    )
  }

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      { fileType: file.type, allowedTypes }
    )
  }

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!allowedExtensions.includes(extension)) {
    throw new ValidationError(
      `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      { extension, allowedExtensions }
    )
  }
}

// Supabase error wrapper
export async function handleSupabaseOperation<T>(
  operation: () => Promise<{ data: T; error: any }>
): Promise<T> {
  const { data, error } = await operation()
  
  if (error) {
    enhancedLogger.logError(
      new Error(error.message),
      'database',
      {
        context: {
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      }
    )
    
    // Map common Supabase errors to our error types
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Resource not found')
    }
    
    if (error.code === '23505') {
      throw new ValidationError('Duplicate entry', { error })
    }
    
    if (error.code === '23503') {
      throw new ValidationError('Foreign key constraint violation', { error })
    }
    
    throw new Error(error.message)
  }
  
  return data
}

// Example usage functions
export const apiUtils = {
  withAuth,
  withAdmin,
  withRateLimit,
  validateRequestBody,
  withDatabaseOperation,
  getPaginationParams,
  parseFilters,
  createApiResponse,
  validateFileUpload,
  handleSupabaseOperation,
}