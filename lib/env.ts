/**
 * Environment Configuration Manager for Antsss Platform
 * 
 * This module provides centralized environment variable management with:
 * - Type-safe environment variable access
 * - Runtime validation
 * - Environment-specific configurations
 * - Feature flag management
 */

import { z } from 'zod'

// Define environment types
export const ENVIRONMENTS = ['development', 'staging', 'production'] as const
export type Environment = typeof ENVIRONMENTS[number]

// Environment variable schemas
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_ENV: z.enum(ENVIRONMENTS),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
})

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
})

const authSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRY: z.string().default('30d'),
  BCRYPT_ROUNDS: z.string().transform(val => parseInt(val, 10)).default('12'),
})

const featureFlagSchema = z.object({
  NEXT_PUBLIC_FEATURE_BOOKING_V2: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_FEATURE_ADVANCED_SEARCH: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_FEATURE_AI_RECOMMENDATIONS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_FEATURE_REAL_TIME_CHAT: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_FEATURE_BETA_DASHBOARD: z.string().transform(val => val === 'true').default('false'),
})

const monitoringSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_HOTJAR_ID: z.string().optional(),
  PERFORMANCE_MONITORING: z.string().transform(val => val === 'true').default('false'),
})

const developmentToolsSchema = z.object({
  NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_DEBUG_TOOLBAR: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_MOCK_API: z.string().transform(val => val === 'true').default('false'),
  DEBUG: z.string().transform(val => val === 'true').default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),
})

const healthCheckSchema = z.object({
  HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default('true'),
  HEALTH_CHECK_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('5000'),
})

// Combined environment schema
export const envSchema = baseEnvSchema
  .merge(supabaseSchema)
  .merge(authSchema)
  .merge(featureFlagSchema)
  .merge(monitoringSchema)
  .merge(developmentToolsSchema)
  .merge(healthCheckSchema)

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n')
      
      throw new Error(`Environment validation failed:\n${missingVars}`)
    }
    throw error
  }
}

// Export parsed environment
export const env = parseEnv()

// Environment-specific configurations
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
export const isStaging = env.NEXT_PUBLIC_ENV === 'staging'

// Feature flag utilities
export const features = {
  bookingV2: env.NEXT_PUBLIC_FEATURE_BOOKING_V2,
  advancedSearch: env.NEXT_PUBLIC_FEATURE_ADVANCED_SEARCH,
  aiRecommendations: env.NEXT_PUBLIC_FEATURE_AI_RECOMMENDATIONS,
  realTimeChat: env.NEXT_PUBLIC_FEATURE_REAL_TIME_CHAT,
  betaDashboard: env.NEXT_PUBLIC_FEATURE_BETA_DASHBOARD,
} as const

// Development tools configuration
export const devTools = {
  reactQueryDevtools: env.NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS,
  debugToolbar: env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLBAR,
  mockApi: env.NEXT_PUBLIC_ENABLE_MOCK_API,
  verboseLogging: env.DEBUG,
} as const

// Environment-specific URL configurations
export const urls = {
  app: env.NEXT_PUBLIC_APP_URL,
  api: env.NEXT_PUBLIC_API_URL,
  supabase: env.NEXT_PUBLIC_SUPABASE_URL,
} as const

// Database configuration
export const database = {
  url: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
} as const

// Cache configuration
export const cache = {
  redisUrl: process.env.REDIS_URL,
  ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 300,
} as const

// Rate limiting configuration
export const rateLimiting = {
  window: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW, 10) : 900000,
  maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : 100,
} as const

// File upload configuration
export const uploads = {
  maxSize: process.env.NEXT_PUBLIC_MAX_FILE_SIZE ? parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE, 10) : 10485760,
  allowedTypes: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'],
  provider: process.env.UPLOAD_PROVIDER || 'supabase',
} as const

// Email configuration
export const email = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'noreply@antsss.com',
} as const

// Payment configuration
export const payments = {
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
} as const

// Social login configuration
export const socialLogin = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  },
} as const

// Monitoring configuration
export const monitoring = {
  sentry: {
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NEXT_PUBLIC_ENV,
  },
  analytics: {
    googleAnalyticsId: env.NEXT_PUBLIC_GA_ID,
    hotjarId: env.NEXT_PUBLIC_HOTJAR_ID,
  },
  performance: env.PERFORMANCE_MONITORING,
} as const

// Health check configuration
export const healthCheck = {
  enabled: env.HEALTH_CHECK_ENABLED,
  timeout: env.HEALTH_CHECK_TIMEOUT,
} as const

// Security configuration
export const security = {
  bcryptRounds: env.BCRYPT_ROUNDS,
  jwtExpiry: env.JWT_EXPIRY,
  refreshTokenExpiry: env.REFRESH_TOKEN_EXPIRY,
  secureHeaders: process.env.SECURE_HEADERS_ENABLED === 'true',
  cspReportOnly: process.env.CSP_REPORT_ONLY === 'true',
} as const

// Logging configuration
export const logging = {
  level: env.LOG_LEVEL,
  format: env.LOG_FORMAT,
  enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
} as const

// Environment validation utility
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check required environment variables for current environment
  if (isProduction) {
    const requiredProdVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
    ]
    
    requiredProdVars.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing required production environment variable: ${varName}`)
      }
    })
  }
  
  // Validate URL formats
  try {
    new URL(env.NEXT_PUBLIC_APP_URL)
    new URL(env.NEXT_PUBLIC_SUPABASE_URL)
  } catch {
    errors.push('Invalid URL format in environment variables')
  }
  
  // Check secret strength in production
  if (isProduction && env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters in production')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

// Get environment info for debugging
export function getEnvironmentInfo() {
  return {
    environment: env.NEXT_PUBLIC_ENV,
    nodeEnv: env.NODE_ENV,
    appName: env.NEXT_PUBLIC_APP_NAME,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    features: Object.entries(features).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, boolean>),
    devTools: Object.entries(devTools).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, boolean>),
    validation: validateEnvironment(),
  }
}

// Environment-specific defaults
export const environmentDefaults = {
  development: {
    logLevel: 'debug' as const,
    enableDevTools: true,
    enableMockApi: false,
    rateLimit: 100,
    cacheTimeout: 300, // 5 minutes
  },
  staging: {
    logLevel: 'info' as const,
    enableDevTools: false,
    enableMockApi: false,
    rateLimit: 50,
    cacheTimeout: 600, // 10 minutes
  },
  production: {
    logLevel: 'warn' as const,
    enableDevTools: false,
    enableMockApi: false,
    rateLimit: 30,
    cacheTimeout: 1800, // 30 minutes
  },
} as const

// Get current environment defaults
export const currentEnvironmentDefaults = environmentDefaults[env.NEXT_PUBLIC_ENV] || environmentDefaults.development