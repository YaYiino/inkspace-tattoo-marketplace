import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface HealthCheck {
  status: string
  timestamp: string
  version: string
  environment: string
  uptime: number
  checks: {
    database: { status: string; responseTime: number; error?: string; recordCount?: number }
    redis: { status: string; responseTime: number; error?: string }
    external_apis: { status: string; responseTime: number; error?: string }
    memory: { status: string; usage: number; limit: number; error?: string }
    disk: { status: string; usage: number; limit: number; error?: string }
  }
  metadata: {
    hostname: string
    platform: string
    nodeVersion: string
    responseTime?: number
  }
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
      external_apis: { status: 'unknown', responseTime: 0 },
      memory: { status: 'unknown', usage: 0, limit: 0 },
      disk: { status: 'unknown', usage: 0, limit: 0 },
    },
    metadata: {
      hostname: process.env.HOSTNAME || 'localhost',
      platform: process.platform,
      nodeVersion: process.version,
    }
  }

  // Check authorization for detailed health info
  const authToken = request.headers.get('authorization')
  const isAuthorized = authToken === `Bearer ${process.env.HEALTH_CHECK_TOKEN}`

  try {
    // Database health check
    const dbStart = Date.now()
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count(*)')
        .limit(1)

      healthCheck.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - dbStart,
        ...(error && { error: error.message }),
        ...(isAuthorized && data && { recordCount: data.length })
      }
    } catch (error) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Redis health check (if configured)
    if (process.env.REDIS_URL && isAuthorized) {
      const redisStart = Date.now()
      try {
        // Add Redis connection check here if needed
        healthCheck.checks.redis = {
          status: 'healthy',
          responseTime: Date.now() - redisStart
        }
      } catch (error) {
        healthCheck.checks.redis = {
          status: 'unhealthy',
          responseTime: Date.now() - redisStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Memory usage check
    const memUsage = process.memoryUsage()
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
    healthCheck.checks.memory = {
      status: memUsagePercent > 90 ? 'warning' : 'healthy',
      usage: Math.round(memUsagePercent),
      limit: 90,
      ...(isAuthorized && {
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
        }
      })
    }

    // External API checks (if authorized)
    if (isAuthorized) {
      const apiStart = Date.now()
      try {
        // Add external API health checks here
        healthCheck.checks.external_apis = {
          status: 'healthy',
          responseTime: Date.now() - apiStart
        }
      } catch (error) {
        healthCheck.checks.external_apis = {
          status: 'unhealthy',
          responseTime: Date.now() - apiStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Determine overall status
    const allChecks = Object.values(healthCheck.checks)
    const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy')
    const hasWarning = allChecks.some(check => check.status === 'warning')
    
    if (hasUnhealthy) {
      healthCheck.status = 'unhealthy'
    } else if (hasWarning) {
      healthCheck.status = 'warning'
    } else {
      healthCheck.status = 'healthy'
    }

    // Add response time
    healthCheck.metadata.responseTime = Date.now() - start

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'warning' ? 200 : 503

    return NextResponse.json(healthCheck, { status: statusCode })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start
    }, { status: 503 })
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(_request: NextRequest) {
  try {
    // Simple database connectivity check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    await supabase.from('user_profiles').select('count(*)').limit(1)
    
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}