// Development tools for error debugging
// Simple placeholder to fix build issues

export interface DevTools {
  enabled: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export const ErrorDebugger = ({ enabled, position }: DevTools) => {
  // Placeholder component for development error debugging
  // This will be properly implemented later
  return null
}

export const devPerformance = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name)
    }
  },
  measure: (name: string, startMark?: string, endMark?: string) => {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark)
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