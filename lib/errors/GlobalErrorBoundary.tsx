'use client'

import React, { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { logger } from '@/lib/monitoring/logger'

interface GlobalErrorBoundaryProps {
  children: ReactNode
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    logger.error('Global error boundary activated', error, {
      type: 'global_error',
      errorInfo,
    })
  }

  return (
    <ErrorBoundary
      name="GlobalErrorBoundary"
      onError={handleError}
      fallback={
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
                Oops! Something went wrong
              </h1>
              <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                We're sorry, but something unexpected happened. Our team has been notified and we're working on a fix.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Reload Page
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Go to Homepage
                </button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  If this problem persists, please{' '}
                  <a
                    href="mailto:support@antsss.com"
                    className="text-black hover:text-gray-800 underline"
                  >
                    contact our support team
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}