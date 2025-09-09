'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { analytics } from '@/lib/monitoring/analytics'
import { enhancedLogger } from '@/lib/monitoring/enhanced-logger'

export default function NotFound() {
  useEffect(() => {
    // Log 404 page view
    enhancedLogger.logError(
      new Error(`Page not found: ${window.location.pathname}`),
      'ui',
      {
        context: {
          type: '404_error',
          path: window.location.pathname,
          referrer: document.referrer,
        },
        tags: {
          error_type: '404',
        },
      }
    )

    // Track 404 in analytics
    analytics.track({
      name: '404_page_viewed',
      properties: {
        path: window.location.pathname,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      },
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 flex items-center justify-center">
            <span className="text-6xl font-bold text-gray-300">404</span>
          </div>
          
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            Page Not Found
          </h1>
          
          <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex flex-col space-y-3">
            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
            >
              Go to Homepage
            </Link>
            
            <Link
              href="/studios"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
            >
              Browse Studios
            </Link>

            <button
              onClick={() => window.history.back()}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
            >
              Go Back
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Can't find what you're looking for?{' '}
              <a
                href="mailto:support@antsss.com?subject=Page Not Found&body=I was looking for: ${window.location.pathname}"
                className="text-black hover:text-gray-800 underline"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>

        {/* Popular links section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 text-center mb-4">
            Popular Pages
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link
              href="/studios"
              className="text-gray-600 hover:text-gray-900 text-center py-2 hover:bg-gray-100 rounded transition-colors duration-200"
            >
              Studios
            </Link>
            <Link
              href="/dashboard/artist"
              className="text-gray-600 hover:text-gray-900 text-center py-2 hover:bg-gray-100 rounded transition-colors duration-200"
            >
              Artist Dashboard
            </Link>
            <Link
              href="/dashboard/studio"
              className="text-gray-600 hover:text-gray-900 text-center py-2 hover:bg-gray-100 rounded transition-colors duration-200"
            >
              Studio Dashboard
            </Link>
            <Link
              href="/profile-completion"
              className="text-gray-600 hover:text-gray-900 text-center py-2 hover:bg-gray-100 rounded transition-colors duration-200"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}