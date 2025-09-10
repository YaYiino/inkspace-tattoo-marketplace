/**
 * Production metrics collection and monitoring for Antsss Tattoo Marketplace
 * Tracks performance, business, and system metrics
 */

import { logger } from './logger'
import { alerts } from './alerts'

export interface Metric {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
  unit?: string
}

export interface MetricThreshold {
  metric: string
  warning: number
  critical: number
  comparison: 'gt' | 'lt' | 'eq'
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map()
  private thresholds: Map<string, MetricThreshold> = new Map()
  private collectors: Map<string, () => Promise<void>> = new Map()
  private intervalId: NodeJS.Timeout | null = null

  constructor() {
    this.setupDefaultThresholds()
    this.setupCollectors()
  }

  private setupDefaultThresholds() {
    const defaultThresholds: MetricThreshold[] = [
      // Performance thresholds
      { metric: 'response_time', warning: 3000, critical: 5000, comparison: 'gt' },
      { metric: 'error_rate', warning: 5, critical: 10, comparison: 'gt' },
      { metric: 'memory_usage', warning: 80, critical: 90, comparison: 'gt' },
      { metric: 'cpu_usage', warning: 70, critical: 85, comparison: 'gt' },
      
      // Business thresholds
      { metric: 'daily_signups', warning: 5, critical: 1, comparison: 'lt' },
      { metric: 'booking_success_rate', warning: 85, critical: 70, comparison: 'lt' },
      { metric: 'user_retention_7d', warning: 40, critical: 25, comparison: 'lt' },
    ]

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold)
    })
  }

  private setupCollectors() {
    // System metrics collector
    this.collectors.set('system', this.collectSystemMetrics.bind(this))
    
    // Business metrics collector
    this.collectors.set('business', this.collectBusinessMetrics.bind(this))
    
    // Performance metrics collector
    this.collectors.set('performance', this.collectPerformanceMetrics.bind(this))
  }

  // Start metrics collection
  start(intervalMs: number = 60000) { // Default: 1 minute
    if (this.intervalId) {
      this.stop()
    }

    logger.info(`Starting metrics collection with ${intervalMs}ms interval`)

    this.intervalId = setInterval(async () => {
      try {
        await this.collectAllMetrics()
      } catch (error) {
        logger.error('Metrics collection error', error as Error)
      }
    }, intervalMs)
  }

  // Stop metrics collection
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Metrics collection stopped')
    }
  }

  // Record a metric
  record(name: string, value: number, tags?: Record<string, string>, unit?: string) {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
      unit
    }

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metricArray = this.metrics.get(name)!
    metricArray.push(metric)

    // Keep only last 1000 metrics per type
    if (metricArray.length > 1000) {
      metricArray.splice(0, metricArray.length - 1000)
    }

    // Check thresholds
    this.checkThresholds(metric)

    logger.debug(`Metric recorded: ${name} = ${value}${unit || ''}`, tags)
  }

  // Collect all metrics
  private async collectAllMetrics() {
    const promises = Array.from(this.collectors.values()).map(collector => collector())
    await Promise.allSettled(promises)
  }

  // System metrics collection
  private async collectSystemMetrics() {
    if (typeof process === 'undefined') return // Browser environment

    try {
      // Memory usage
      const memUsage = process.memoryUsage()
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
      this.record('memory_usage', Math.round(memoryUsagePercent), {}, '%')

      // Process uptime
      this.record('process_uptime', Math.round(process.uptime()), {}, 'seconds')

      // Event loop lag (approximate)
      const start = process.hrtime.bigint()
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6 // Convert to ms
        this.record('event_loop_lag', Math.round(lag), {}, 'ms')
      })

    } catch (error) {
      logger.error('Error collecting system metrics', error as Error)
    }
  }

  // Business metrics collection
  private async collectBusinessMetrics() {
    try {
      // These would typically come from your database
      // For now, we'll simulate or collect from API endpoints

      // Daily active users (would query your database)
      const dauResponse = await this.queryBusinessMetric('/api/metrics/daily-active-users')
      if (dauResponse) {
        this.record('daily_active_users', dauResponse.count, { type: 'business' })
      }

      // Signup conversion rate
      const signupResponse = await this.queryBusinessMetric('/api/metrics/signup-rate')
      if (signupResponse) {
        this.record('signup_conversion_rate', signupResponse.rate, { type: 'conversion' }, '%')
      }

      // Booking metrics
      const bookingResponse = await this.queryBusinessMetric('/api/metrics/bookings')
      if (bookingResponse) {
        this.record('daily_bookings', bookingResponse.daily_count, { type: 'business' })
        this.record('booking_success_rate', bookingResponse.success_rate, { type: 'business' }, '%')
      }

    } catch (error) {
      logger.error('Error collecting business metrics', error as Error)
    }
  }

  // Performance metrics collection
  private async collectPerformanceMetrics() {
    try {
      // API response times (from health check)
      const healthStart = Date.now()
      const healthResponse = await fetch('/api/health', { 
        method: 'HEAD',
        timeout: 5000 
      }).catch(() => null)
      
      if (healthResponse) {
        const responseTime = Date.now() - healthStart
        this.record('api_response_time', responseTime, { endpoint: 'health' }, 'ms')
        this.record('api_success_rate', healthResponse.ok ? 100 : 0, { endpoint: 'health' }, '%')
      }

      // Database response time (if health check includes DB metrics)
      if (healthResponse?.ok) {
        try {
          const healthData = await healthResponse.json()
          if (healthData.checks?.database?.responseTime) {
            this.record('database_response_time', 
              healthData.checks.database.responseTime, 
              { type: 'database' }, 
              'ms'
            )
          }
        } catch (e) {
          // Health check might not return JSON for HEAD request
        }
      }

    } catch (error) {
      logger.error('Error collecting performance metrics', error as Error)
    }
  }

  // Helper to query business metrics from API
  private async queryBusinessMetric(endpoint: string): Promise<any> {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${process.env.METRICS_API_TOKEN || ''}`,
        },
        timeout: 5000
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      logger.debug(`Failed to query business metric ${endpoint}`, { error: (error as Error).message })
    }

    return null
  }

  // Check thresholds and send alerts
  private checkThresholds(metric: Metric) {
    const threshold = this.thresholds.get(metric.name)
    if (!threshold) return

    const { warning, critical, comparison } = threshold
    const value = metric.value

    let alertLevel: 'warning' | 'critical' | null = null

    switch (comparison) {
      case 'gt':
        if (value >= critical) alertLevel = 'critical'
        else if (value >= warning) alertLevel = 'warning'
        break
      case 'lt':
        if (value <= critical) alertLevel = 'critical'
        else if (value <= warning) alertLevel = 'warning'
        break
      case 'eq':
        if (value === critical) alertLevel = 'critical'
        else if (value === warning) alertLevel = 'warning'
        break
    }

    if (alertLevel) {
      const severity = alertLevel === 'critical' ? 'critical' : 'high'
      alerts.custom({
        id: `threshold-${metric.name}-${Date.now()}`,
        severity,
        title: `${metric.name} Threshold Exceeded`,
        message: `${metric.name} is ${value}${metric.unit || ''} (${alertLevel} threshold: ${alertLevel === 'critical' ? critical : warning})`,
        source: 'metrics-collector',
        metadata: {
          metric: metric.name,
          value,
          threshold: alertLevel === 'critical' ? critical : warning,
          unit: metric.unit,
          tags: metric.tags
        }
      })
    }
  }

  // Get metrics for a specific name
  getMetrics(name: string, limit?: number): Metric[] {
    const metrics = this.metrics.get(name) || []
    return limit ? metrics.slice(-limit) : metrics
  }

  // Get latest metric value
  getLatest(name: string): Metric | null {
    const metrics = this.getMetrics(name, 1)
    return metrics.length > 0 ? metrics[0] : null
  }

  // Calculate average over time period
  getAverage(name: string, minutesBack: number = 60): number | null {
    const cutoff = new Date(Date.now() - minutesBack * 60 * 1000)
    const recentMetrics = this.getMetrics(name)
      .filter(m => m.timestamp >= cutoff)

    if (recentMetrics.length === 0) return null

    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0)
    return Math.round((sum / recentMetrics.length) * 100) / 100
  }

  // Get metrics summary for dashboard
  getSummary() {
    const summary: Record<string, any> = {}

    for (const [name] of this.metrics) {
      const latest = this.getLatest(name)
      const average = this.getAverage(name, 60) // 1 hour average

      if (latest) {
        summary[name] = {
          latest: latest.value,
          average,
          unit: latest.unit,
          timestamp: latest.timestamp,
          tags: latest.tags
        }
      }
    }

    return summary
  }

  // Export metrics for external systems (Prometheus format)
  exportPrometheus(): string {
    let output = ''

    for (const [name, metricArray] of this.metrics) {
      const latest = metricArray[metricArray.length - 1]
      if (!latest) continue

      // Convert to Prometheus format
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_')
      const help = `# HELP ${metricName} ${name} metric from Antsss`
      const type = `# TYPE ${metricName} gauge`
      
      let labels = ''
      if (latest.tags && Object.keys(latest.tags).length > 0) {
        const labelPairs = Object.entries(latest.tags)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')
        labels = `{${labelPairs}}`
      }

      const value = `${metricName}${labels} ${latest.value}`

      output += `${help}\n${type}\n${value}\n\n`
    }

    return output
  }

  // Add custom threshold
  addThreshold(threshold: MetricThreshold) {
    this.thresholds.set(threshold.metric, threshold)
    logger.info(`Threshold added for ${threshold.metric}`)
  }

  // Remove threshold
  removeThreshold(metricName: string) {
    this.thresholds.delete(metricName)
    logger.info(`Threshold removed for ${metricName}`)
  }
}

// Export singleton instance
export const metrics = new MetricsCollector()

// Export convenience functions for recording metrics
export const recordMetric = {
  // Performance metrics
  responseTime: (endpoint: string, time: number) => 
    metrics.record('response_time', time, { endpoint }, 'ms'),

  errorRate: (endpoint: string, rate: number) =>
    metrics.record('error_rate', rate, { endpoint }, '%'),

  // Business metrics
  userSignup: (method: string) =>
    metrics.record('user_signups', 1, { method }),

  bookingCreated: (artistType: string) =>
    metrics.record('bookings_created', 1, { artist_type: artistType }),

  profileViews: (profileType: string) =>
    metrics.record('profile_views', 1, { profile_type: profileType }),

  // System metrics
  memoryUsage: (percentage: number) =>
    metrics.record('memory_usage', percentage, {}, '%'),

  cpuUsage: (percentage: number) =>
    metrics.record('cpu_usage', percentage, {}, '%'),

  // Custom metrics
  custom: (name: string, value: number, tags?: Record<string, string>, unit?: string) =>
    metrics.record(name, value, tags, unit)
}

export type MetricsCollector = typeof metrics