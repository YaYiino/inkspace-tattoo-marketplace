'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/monitoring/logger'
import { analytics } from '@/lib/monitoring/analytics'
import { captureError, addBreadcrumb } from '@/lib/monitoring/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean
  name?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })

    // Log the error
    logger.error('React Error Boundary caught error', error, {
      component: this.props.name || 'UnknownComponent',
      isolate: this.props.isolate,
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Track in analytics
    analytics.errorOccurred(error, {
      type: 'react_error_boundary',
      component: this.props.name || 'UnknownComponent',
      isolate: this.props.isolate,
      componentStack: errorInfo.componentStack,
    })

    // Send to Sentry with context
    addBreadcrumb({
      message: 'Error boundary caught error',
      category: 'error',
      level: 'error',
      data: {
        component: this.props.name,
        isolate: this.props.isolate,
      },
    })
    
    captureError(error, {
      component: this.props.name || 'UnknownComponent',
      errorBoundary: true,
      isolate: this.props.isolate,
      componentStack: errorInfo.componentStack,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="error-boundary-fallback">
          <div className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 mb-4">
                {this.props.isolate
                  ? 'This component encountered an error but the rest of the page should work normally.'
                  : 'An unexpected error occurred. Please try refreshing the page.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false })}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm text-red-600 cursor-pointer hover:text-red-500">
                    Show Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-4 bg-red-100 rounded border text-xs font-mono text-red-800 overflow-auto max-h-40">
                    <div className="font-bold mb-2">{this.state.error.name}: {this.state.error.message}</div>
                    <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                    {this.state.errorInfo && (
                      <div className="mt-4 border-t border-red-200 pt-2">
                        <div className="font-bold mb-1">Component Stack:</div>
                        <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: { [key: string]: any }) => {
    logger.error('Manual error report', error, errorInfo)
    analytics.errorOccurred(error, { ...errorInfo, type: 'manual_report' })
    captureError(error, { ...errorInfo, manual: true })
  }
}