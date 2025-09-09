interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: string
}

interface UserProperties {
  userId: string
  properties: Record<string, any>
}

class Analytics {
  private static instance: Analytics
  private isEnabled: boolean
  private userId?: string

  private constructor() {
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    this.initializeProviders()
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics()
    }
    return Analytics.instance
  }

  private async initializeProviders() {
    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      // Initialize Google Analytics
      if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        const { gtag } = await import('gtag')
        gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
          page_title: document.title,
          page_location: window.location.href,
        })
      }

      // Initialize Mixpanel
      if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
        const mixpanel = await import('mixpanel-browser')
        mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
          debug: process.env.NODE_ENV === 'development',
          track_pageview: true,
          persistence: 'localStorage',
        })
      }

      // Initialize Vercel Analytics
      if (process.env.NEXT_PUBLIC_VERCEL_ANALYTICS) {
        const { track } = await import('@vercel/analytics')
        // Vercel Analytics is automatically initialized
      }

    } catch (error) {
      console.error('Failed to initialize analytics:', error)
    }
  }

  setUserId(userId: string) {
    this.userId = userId

    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      // Set user ID in Google Analytics
      if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        const { gtag } = require('gtag')
        gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
          user_id: userId,
        })
      }

      // Set user ID in Mixpanel
      if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
        const mixpanel = require('mixpanel-browser')
        mixpanel.identify(userId)
      }

    } catch (error) {
      console.error('Failed to set user ID:', error)
    }
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      // Set user properties in Mixpanel
      if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
        const mixpanel = require('mixpanel-browser')
        mixpanel.people.set(properties)
      }

      // Set user properties in Google Analytics
      if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        const { gtag } = require('gtag')
        gtag('set', { custom_map: properties })
      }

    } catch (error) {
      console.error('Failed to set user properties:', error)
    }
  }

  track(event: AnalyticsEvent) {
    if (!this.isEnabled) return

    const eventData = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      userId: event.userId || this.userId,
    }

    // Log event for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', eventData)
    }

    if (typeof window === 'undefined') {
      // Server-side tracking (if needed)
      this.trackServerSide(eventData)
      return
    }

    try {
      // Track in Google Analytics
      if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        const { gtag } = require('gtag')
        gtag('event', event.name, {
          ...event.properties,
          user_id: eventData.userId,
        })
      }

      // Track in Mixpanel
      if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
        const mixpanel = require('mixpanel-browser')
        mixpanel.track(event.name, {
          ...event.properties,
          userId: eventData.userId,
          timestamp: eventData.timestamp,
        })
      }

      // Track in Vercel Analytics
      if (process.env.NEXT_PUBLIC_VERCEL_ANALYTICS) {
        const { track } = require('@vercel/analytics')
        track(event.name, event.properties)
      }

    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  private async trackServerSide(event: AnalyticsEvent) {
    try {
      // Send to internal analytics API
      if (process.env.ANALYTICS_API_URL) {
        await fetch(process.env.ANALYTICS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ANALYTICS_API_TOKEN}`,
          },
          body: JSON.stringify(event),
        })
      }
    } catch (error) {
      console.error('Failed to track server-side event:', error)
    }
  }

  // Page view tracking
  pageView(path: string, title?: string) {
    this.track({
      name: 'page_view',
      properties: {
        path,
        title: title || document.title,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      },
    })
  }

  // Business event tracking methods
  userSignUp(method: string, properties?: Record<string, any>) {
    this.track({
      name: 'user_sign_up',
      properties: {
        method,
        ...properties,
      },
    })
  }

  userLogin(method: string, properties?: Record<string, any>) {
    this.track({
      name: 'user_login',
      properties: {
        method,
        ...properties,
      },
    })
  }

  bookingCreated(bookingId: string, artistId: string, studioId: string, properties?: Record<string, any>) {
    this.track({
      name: 'booking_created',
      properties: {
        booking_id: bookingId,
        artist_id: artistId,
        studio_id: studioId,
        ...properties,
      },
    })
  }

  bookingConfirmed(bookingId: string, properties?: Record<string, any>) {
    this.track({
      name: 'booking_confirmed',
      properties: {
        booking_id: bookingId,
        ...properties,
      },
    })
  }

  searchPerformed(query: string, filters: Record<string, any>, resultCount: number) {
    this.track({
      name: 'search_performed',
      properties: {
        query,
        filters,
        result_count: resultCount,
        search_timestamp: new Date().toISOString(),
      },
    })
  }

  studioViewed(studioId: string, properties?: Record<string, any>) {
    this.track({
      name: 'studio_viewed',
      properties: {
        studio_id: studioId,
        ...properties,
      },
    })
  }

  artistViewed(artistId: string, properties?: Record<string, any>) {
    this.track({
      name: 'artist_viewed',
      properties: {
        artist_id: artistId,
        ...properties,
      },
    })
  }

  reviewSubmitted(bookingId: string, rating: number, properties?: Record<string, any>) {
    this.track({
      name: 'review_submitted',
      properties: {
        booking_id: bookingId,
        rating,
        ...properties,
      },
    })
  }

  // Error tracking
  errorOccurred(error: Error, context?: Record<string, any>) {
    this.track({
      name: 'error_occurred',
      properties: {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
        context,
      },
    })
  }

  // Performance tracking
  performanceMetric(metric: string, value: number, properties?: Record<string, any>) {
    this.track({
      name: 'performance_metric',
      properties: {
        metric,
        value,
        ...properties,
      },
    })
  }

  // Feature usage tracking
  featureUsed(feature: string, properties?: Record<string, any>) {
    this.track({
      name: 'feature_used',
      properties: {
        feature,
        ...properties,
      },
    })
  }
}

// Export singleton instance
export const analytics = Analytics.getInstance()

// Export types
export type { AnalyticsEvent, UserProperties }