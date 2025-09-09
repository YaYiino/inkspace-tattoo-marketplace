'use client'

import React, { useState, useEffect, useRef } from 'react'
import { enhancedLogger } from '@/lib/monitoring/enhanced-logger'
import { analytics } from '@/lib/monitoring/analytics'
import { performanceMonitor } from '@/lib/monitoring/performance'

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  category: string
  metadata?: Record<string, any>
  stack?: string
}

interface PerformanceEntry {
  name: string
  value: number
  timestamp: string
  category: string
}

interface ErrorDebuggerProps {
  enabled?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  maxLogs?: number
}

export function ErrorDebugger({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  maxLogs = 100 
}: ErrorDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [performanceEntries, setPerformanceEntries] = useState<PerformanceEntry[]>([])
  const [activeTab, setActiveTab] = useState<'logs' | 'performance' | 'network' | 'storage'>('logs')
  const [networkRequests, setNetworkRequests] = useState<any[]>([])
  const [storageData, setStorageData] = useState<Record<string, any>>({})
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    // Intercept console methods to capture logs
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    }

    const interceptConsole = (level: LogEntry['level'], originalMethod: any) => {
      return (...args: any[]) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')

        const logEntry: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          level,
          message,
          category: 'console',
          metadata: args.length > 1 ? { args } : undefined,
        }

        setLogs(prev => {
          const updated = [...prev, logEntry].slice(-maxLogs)
          return updated
        })

        originalMethod.apply(console, args)
      }
    }

    console.log = interceptConsole('info', originalConsole.log)
    console.warn = interceptConsole('warn', originalConsole.warn)
    console.error = interceptConsole('error', originalConsole.error)
    console.debug = interceptConsole('debug', originalConsole.debug)

    // Intercept network requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = Date.now()
      const url = typeof args[0] === 'string' ? args[0] : args[0].url
      
      try {
        const response = await originalFetch(...args)
        const endTime = Date.now()
        
        const networkEntry = {
          id: Math.random().toString(36).substr(2, 9),
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          success: response.ok,
        }
        
        setNetworkRequests(prev => [...prev, networkEntry].slice(-50))
        return response
      } catch (error) {
        const endTime = Date.now()
        
        const networkEntry = {
          id: Math.random().toString(36).substr(2, 9),
          url,
          method: args[1]?.method || 'GET',
          status: 0,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          success: false,
          error: (error as Error).message,
        }
        
        setNetworkRequests(prev => [...prev, networkEntry].slice(-50))
        throw error
      }
    }

    // Monitor performance metrics
    const performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const perfEntry: PerformanceEntry = {
          name: entry.name,
          value: entry.duration || entry.startTime,
          timestamp: new Date().toISOString(),
          category: entry.entryType,
        }
        
        setPerformanceEntries(prev => [...prev, perfEntry].slice(-50))
      }
    })

    try {
      performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
    } catch (error) {
      console.debug('Performance observer not supported')
    }

    // Monitor storage changes
    const updateStorageData = () => {
      const storage = {
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          try {
            acc[key] = JSON.parse(localStorage.getItem(key) || 'null')
          } catch {
            acc[key] = localStorage.getItem(key)
          }
          return acc
        }, {} as Record<string, any>),
        sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
          try {
            acc[key] = JSON.parse(sessionStorage.getItem(key) || 'null')
          } catch {
            acc[key] = sessionStorage.getItem(key)
          }
          return acc
        }, {} as Record<string, any>),
      }
      setStorageData(storage)
    }

    updateStorageData()
    
    // Monitor storage events
    window.addEventListener('storage', updateStorageData)

    // Cleanup
    return () => {
      console.log = originalConsole.log
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.debug = originalConsole.debug
      window.fetch = originalFetch
      performanceObserver.disconnect()
      window.removeEventListener('storage', updateStorageData)
    }
  }, [enabled, maxLogs])

  useEffect(() => {
    if (logsRef.current && activeTab === 'logs') {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs, activeTab])

  if (!enabled) return null

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      case 'debug': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const clearLogs = () => {
    setLogs([])
    setNetworkRequests([])
    setPerformanceEntries([])
  }

  const exportLogs = () => {
    const data = {
      logs,
      networkRequests,
      performanceEntries,
      storageData,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const testError = () => {
    throw new Error('Test error for debugging')
  }

  const testPerformance = () => {
    performanceMonitor.mark('test-start')
    setTimeout(() => {
      performanceMonitor.mark('test-end')
      performanceMonitor.measure('test-operation', 'test-start', 'test-end')
    }, 100)
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 font-mono text-sm`}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white px-3 py-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
          title="Open Debug Panel"
        >
          🐛 {logs.filter(l => l.level === 'error').length}
        </button>
      ) : (
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-xl w-96 h-96 flex flex-col">
          {/* Header */}
          <div className="bg-gray-100 px-4 py-2 border-b flex items-center justify-between rounded-t-lg">
            <h3 className="font-semibold">Debug Panel</h3>
            <div className="flex gap-1">
              <button
                onClick={clearLogs}
                className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                title="Clear logs"
              >
                Clear
              </button>
              <button
                onClick={exportLogs}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                title="Export logs"
              >
                Export
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-600 hover:text-gray-800"
                title="Close panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            {(['logs', 'performance', 'network', 'storage'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-2 py-1 text-xs capitalize ${
                  activeTab === tab 
                    ? 'bg-white border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab}
                {tab === 'logs' && logs.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-xs">
                    {logs.filter(l => l.level === 'error').length || logs.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'logs' && (
              <div ref={logsRef} className="h-full overflow-y-auto p-2 space-y-1">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">No logs yet</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className={`p-2 rounded text-xs ${getLevelColor(log.level)}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold uppercase">{log.level}</span>
                        <span className="text-xs opacity-75">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">{log.message}</div>
                      {log.metadata && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs opacity-75">Metadata</summary>
                          <pre className="mt-1 text-xs opacity-75 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stack && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs opacity-75">Stack Trace</summary>
                          <pre className="mt-1 text-xs opacity-75 overflow-x-auto whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="h-full overflow-y-auto p-2">
                <div className="mb-2 flex gap-1">
                  <button
                    onClick={testPerformance}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Test Performance
                  </button>
                </div>
                <div className="space-y-1">
                  {performanceEntries.map(entry => (
                    <div key={`${entry.name}-${entry.timestamp}`} className="p-2 bg-green-50 rounded text-xs">
                      <div className="font-semibold">{entry.name}</div>
                      <div>Value: {entry.value.toFixed(2)}ms</div>
                      <div>Category: {entry.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="h-full overflow-y-auto p-2 space-y-1">
                {networkRequests.map(request => (
                  <div key={request.id} className={`p-2 rounded text-xs ${
                    request.success ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold">{request.method}</span>
                      <span className={`px-1 rounded ${
                        request.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="break-all">{request.url}</div>
                    <div className="flex justify-between">
                      <span>{request.duration}ms</span>
                      <span>{new Date(request.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {request.error && (
                      <div className="mt-1 text-red-600">{request.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="h-full overflow-y-auto p-2">
                <div className="space-y-2">
                  <div>
                    <h4 className="font-semibold mb-1">localStorage</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(storageData.localStorage, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">sessionStorage</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(storageData.sessionStorage, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-4 py-2 flex justify-between items-center text-xs">
            <div>
              Errors: {logs.filter(l => l.level === 'error').length} | 
              Total: {logs.length}
            </div>
            <button
              onClick={testError}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              title="Trigger test error"
            >
              Test Error
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Source map error decoder for production
export function decodeSourceMapError(error: Error) {
  if (process.env.NODE_ENV !== 'development') {
    // In production, you might want to decode source maps
    // This is a placeholder for source map integration
    return error
  }
  return error
}

// Performance timing utilities for development
export const devPerformance = {
  mark: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`dev-${name}`)
      console.log(`🚀 Mark: ${name}`)
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (process.env.NODE_ENV === 'development') {
      const fullStartMark = `dev-${startMark}`
      const fullEndMark = endMark ? `dev-${endMark}` : undefined
      
      try {
        performance.measure(`dev-${name}`, fullStartMark, fullEndMark)
        const entries = performance.getEntriesByName(`dev-${name}`)
        const duration = entries[entries.length - 1]?.duration
        console.log(`⏱️ Measure: ${name} took ${duration?.toFixed(2)}ms`)
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error)
      }
    }
  },
  
  time: <T>(name: string, fn: () => T): T => {
    if (process.env.NODE_ENV === 'development') {
      devPerformance.mark(`${name}-start`)
      const result = fn()
      devPerformance.mark(`${name}-end`)
      devPerformance.measure(name, `${name}-start`, `${name}-end`)
      return result
    }
    return fn()
  },
}