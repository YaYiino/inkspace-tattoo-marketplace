'use client'

import { enhancedLogger } from './enhanced-logger'
import { analytics } from './analytics'

interface PerformanceConfig {
  enableWebVitals: boolean
  enableResourceTiming: boolean
  enableNavigationTiming: boolean
  enableUserTiming: boolean
  enableLongTasks: boolean
  thresholds: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
    fcp: number // First Contentful Paint
    ttfb: number // Time to First Byte
  }
}

const defaultConfig: PerformanceConfig = {
  enableWebVitals: true,
  enableResourceTiming: true,
  enableNavigationTiming: true,
  enableUserTiming: true,
  enableLongTasks: true,
  thresholds: {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 2000,
    ttfb: 600,
  },
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private config: PerformanceConfig
  private observers: PerformanceObserver[] = []
  private metrics: Map<string, number> = new Map()
  private startTime: number = performance.now()

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.initialize()
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config)
    }
    return PerformanceMonitor.instance
  }

  private initialize() {
    if (typeof window === 'undefined') return

    // Initialize performance observers
    if (this.config.enableWebVitals) {
      this.initializeWebVitalsObserver()
    }

    if (this.config.enableResourceTiming) {
      this.initializeResourceTimingObserver()
    }

    if (this.config.enableNavigationTiming) {
      this.initializeNavigationTimingObserver()
    }

    if (this.config.enableUserTiming) {
      this.initializeUserTimingObserver()
    }

    if (this.config.enableLongTasks) {
      this.initializeLongTaskObserver()
    }

    // Monitor page lifecycle
    this.initializePageLifecycleMonitoring()

    // Monitor memory usage
    this.initializeMemoryMonitoring()
  }

  private initializeWebVitalsObserver() {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const lcp = entry.startTime
          this.recordMetric('lcp', lcp)
          
          if (lcp > this.config.thresholds.lcp) {
            enhancedLogger.logError(
              new Error(`Poor LCP performance: ${lcp}ms`),
              'performance',
              {
                context: { metric: 'lcp', value: lcp, threshold: this.config.thresholds.lcp },
                tags: { performance_issue: 'lcp' },
              }
            )
          }
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = entry.processingStart - entry.startTime
          this.recordMetric('fid', fid)
          
          if (fid > this.config.thresholds.fid) {
            enhancedLogger.logError(
              new Error(`Poor FID performance: ${fid}ms`),
              'performance',
              {
                context: { metric: 'fid', value: fid, threshold: this.config.thresholds.fid },
                tags: { performance_issue: 'fid' },
              }
            )
          }
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        
        if (clsValue > 0) {
          this.recordMetric('cls', clsValue)
          
          if (clsValue > this.config.thresholds.cls) {
            enhancedLogger.logError(
              new Error(`Poor CLS performance: ${clsValue}`),
              'performance',
              {
                context: { metric: 'cls', value: clsValue, threshold: this.config.thresholds.cls },
                tags: { performance_issue: 'cls' },
              }
            )
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime
            this.recordMetric('fcp', fcp)
            
            if (fcp > this.config.thresholds.fcp) {
              enhancedLogger.logError(
                new Error(`Poor FCP performance: ${fcp}ms`),
                'performance',
                {
                  context: { metric: 'fcp', value: fcp, threshold: this.config.thresholds.fcp },
                  tags: { performance_issue: 'fcp' },
                }
              )
            }
          }
        }
      })
      fcpObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(fcpObserver)

    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'performance',
        { context: { message: 'Failed to initialize Web Vitals observer' } }
      )
    }
  }

  private initializeResourceTimingObserver() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming
          const duration = resource.responseEnd - resource.requestStart

          // Log slow resources
          if (duration > 1000) {
            enhancedLogger.logPerformance({
              name: 'slow_resource',
              value: duration,
              tags: {
                resource_type: resource.initiatorType,
                resource_name: resource.name,
              },
            })
          }

          // Track resource types
          analytics.track({
            name: 'resource_loaded',
            properties: {
              type: resource.initiatorType,
              duration,
              size: resource.transferSize,
              cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
            },
          })
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'performance',
        { context: { message: 'Failed to initialize resource timing observer' } }
      )
    }
  }

  private initializeNavigationTimingObserver() {
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const nav = entry as PerformanceNavigationTiming
          
          // Calculate key navigation metrics
          const ttfb = nav.responseStart - nav.requestStart
          const domLoad = nav.domContentLoadedEventEnd - nav.navigationStart
          const pageLoad = nav.loadEventEnd - nav.navigationStart

          this.recordMetric('ttfb', ttfb)
          this.recordMetric('dom_load', domLoad)
          this.recordMetric('page_load', pageLoad)

          // Check thresholds
          if (ttfb > this.config.thresholds.ttfb) {
            enhancedLogger.logError(
              new Error(`Poor TTFB performance: ${ttfb}ms`),
              'performance',
              {
                context: { metric: 'ttfb', value: ttfb, threshold: this.config.thresholds.ttfb },
                tags: { performance_issue: 'ttfb' },
              }
            )
          }

          analytics.track({
            name: 'page_navigation',
            properties: {
              ttfb,
              dom_load: domLoad,
              page_load: pageLoad,
              navigation_type: nav.type,
            },
          })
        }
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)
    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'performance',
        { context: { message: 'Failed to initialize navigation timing observer' } }
      )
    }
  }

  private initializeUserTimingObserver() {
    try {
      const userTimingObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          enhancedLogger.logPerformance({
            name: entry.name,
            value: entry.duration || entry.startTime,
            tags: {
              entry_type: entry.entryType,
              user_timing: 'true',
            },
          })
        }
      })
      userTimingObserver.observe({ entryTypes: ['measure', 'mark'] })
      this.observers.push(userTimingObserver)
    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'performance',
        { context: { message: 'Failed to initialize user timing observer' } }
      )
    }
  }

  private initializeLongTaskObserver() {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          enhancedLogger.logError(
            new Error(`Long task detected: ${entry.duration}ms`),
            'performance',
            {
              context: {
                task_duration: entry.duration,
                start_time: entry.startTime,
                attribution: (entry as any).attribution,
              },
              tags: { performance_issue: 'long_task' },
            }
          )

          analytics.track({
            name: 'long_task_detected',
            properties: {
              duration: entry.duration,
              start_time: entry.startTime,
            },
          })
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'performance',
        { context: { message: 'Failed to initialize long task observer' } }
      )
    }
  }

  private initializePageLifecycleMonitoring() {
    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      const visibilityState = document.visibilityState
      const timeOnPage = performance.now() - this.startTime

      analytics.track({
        name: 'page_visibility_change',
        properties: {
          visibility_state: visibilityState,
          time_on_page: timeOnPage,
        },
      })

      if (visibilityState === 'hidden') {
        this.sendMetricsBatch()
      }
    })

    // Monitor page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetricsBatch()
    })

    // Monitor page freeze/resume
    document.addEventListener('freeze', () => {
      analytics.track({
        name: 'page_freeze',
        properties: { time_on_page: performance.now() - this.startTime },
      })
    })

    document.addEventListener('resume', () => {
      analytics.track({
        name: 'page_resume',
        properties: { time_on_page: performance.now() - this.startTime },
      })
    })
  }

  private initializeMemoryMonitoring() {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory
        const memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        }

        // Alert on high memory usage
        const usagePercentage = (memoryUsage.used / memoryUsage.total) * 100
        if (usagePercentage > 90) {
          enhancedLogger.logError(
            new Error(`High memory usage: ${usagePercentage.toFixed(1)}%`),
            'performance',
            {
              context: { memory_usage: memoryUsage },
              tags: { performance_issue: 'memory' },
            }
          )
        }

        analytics.track({
          name: 'memory_usage',
          properties: memoryUsage,
        })
      }

      // Check memory usage every 30 seconds
      setInterval(checkMemory, 30000)
    }
  }

  private recordMetric(name: string, value: number) {
    this.metrics.set(name, value)
    
    enhancedLogger.logPerformance({
      name,
      value,
      tags: { web_vitals: 'true' },
    })
  }

  private sendMetricsBatch() {
    const allMetrics = Object.fromEntries(this.metrics)
    
    analytics.track({
      name: 'performance_metrics_batch',
      properties: {
        ...allMetrics,
        session_duration: performance.now() - this.startTime,
      },
    })

    enhancedLogger.logPerformance({
      name: 'session_metrics_batch',
      value: performance.now() - this.startTime,
      tags: { batch: 'true' },
    })
  }

  // Public methods for manual performance tracking
  public mark(name: string) {
    performance.mark(name)
  }

  public measure(name: string, startMark: string, endMark?: string) {
    performance.measure(name, startMark, endMark)
  }

  public timeFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()
    
    this.recordMetric(name, endTime - startTime)
    return result
  }

  public async timeAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()
    
    this.recordMetric(name, endTime - startTime)
    return result
  }

  public getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  public disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Export utility functions
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return performanceMonitor.timeFunction(name, () => fn(...args))
  }) as T
}

export function withAsyncPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return performanceMonitor.timeAsyncFunction(name, () => fn(...args))
  }) as T
}