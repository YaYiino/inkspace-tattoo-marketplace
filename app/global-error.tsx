'use client'

import { useEffect } from 'react'
import { enhancedLogger } from '@/lib/monitoring/enhanced-logger'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical global error
    enhancedLogger.logError(error, 'ui', {
      context: {
        type: 'global_error',
        digest: error.digest,
        critical: true,
      },
      tags: {
        error_page: 'global',
        critical: 'true',
      },
    })
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-red-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              <svg
                className="mx-auto h-24 w-24 text-red-500"
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
              
              <h1 className="mt-6 text-3xl font-extrabold text-red-900">
                Critical Error
              </h1>
              
              <p className="mt-2 text-sm text-red-700 max-w-sm mx-auto">
                A critical error has occurred and the application cannot continue. 
                Our team has been automatically notified.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Reload Application
                </button>

                <button
                  onClick={reset}
                  className="w-full flex justify-center py-3 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Try to Recover
                </button>
              </div>

              <div className="text-center">
                <p className="text-xs text-red-600">
                  Emergency support:{' '}
                  <a
                    href="mailto:emergency@antsss.com?subject=Critical Application Error&body=Error ID: ${error.digest || 'Unknown'}"
                    className="font-medium underline hover:text-red-800"
                  >
                    emergency@antsss.com
                  </a>
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6">
                  <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                    Show Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-4 bg-red-100 rounded border text-xs font-mono text-red-800 overflow-auto max-h-60">
                    <div className="font-bold mb-2">Global Error: {error.name}</div>
                    <div className="mb-2">Message: {error.message}</div>
                    {error.stack && (
                      <div>
                        <div className="font-bold mb-1">Stack Trace:</div>
                        <pre className="whitespace-pre-wrap">{error.stack}</pre>
                      </div>
                    )}
                    {error.digest && (
                      <div className="mt-2 pt-2 border-t border-red-300">
                        <div className="font-bold">Digest: {error.digest}</div>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}