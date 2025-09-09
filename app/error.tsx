'use client'

import { useEffect } from 'react'
import { enhancedLogger } from '@/lib/monitoring/enhanced-logger'
import { analytics } from '@/lib/monitoring/analytics'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error when the error page is shown
    enhancedLogger.logError(error, 'ui', {
      context: {
        type: 'page_error',
        digest: error.digest,
        path: window.location.pathname,
      },
      tags: {
        error_page: 'true',
      },
    })

    // Track error page view
    analytics.track({
      name: 'error_page_viewed',
      properties: {
        error_name: error.name,
        error_message: error.message,
        digest: error.digest,
        path: window.location.pathname,
      },
    })
  }, [error])

  const getErrorMessage = () => {
    if (process.env.NODE_ENV === 'development') {
      return error.message
    }

    // Don't expose detailed error messages in production
    if (error.name === 'ChunkLoadError') {
      return 'There was a problem loading the application. Please refresh the page.'
    }

    if (error.message.includes('Network')) {
      return 'Unable to connect to our servers. Please check your internet connection and try again.'
    }

    return 'An unexpected error occurred. We\'ve been notified and are working on a fix.'
  }

  const getErrorTitle = () => {
    if (error.name === 'ChunkLoadError') {
      return 'Loading Error'
    }

    if (error.message.includes('Network')) {
      return 'Connection Error'
    }

    return 'Something Went Wrong'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <svg
            className="mx-auto h-24 w-24 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getErrorTitle()}
          </h1>
          
          <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
            {getErrorMessage()}
          </p>

          {process.env.NODE_ENV === 'development' && error.digest && (
            <p className="mt-2 text-xs text-gray-400 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex flex-col space-y-3">
            <button
              onClick={reset}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
            >
              Reload Page
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
            >
              Go to Homepage
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              If this problem persists, please{' '}
              <a
                href="mailto:support@antsss.com?subject=Error Report&body=Error: ${error.name} - ${error.message}"
                className="text-black hover:text-gray-800 underline"
              >
                contact our support team
              </a>
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Show Technical Details (Development Only)
              </summary>
              <div className="mt-2 p-4 bg-gray-100 rounded border text-xs font-mono text-gray-800 overflow-auto max-h-60">
                <div className="font-bold mb-2">Error: {error.name}</div>
                <div className="mb-2">Message: {error.message}</div>
                {error.stack && (
                  <div>
                    <div className="font-bold mb-1">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
                {error.digest && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="font-bold">Digest: {error.digest}</div>
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