/**
 * Mixpanel analytics integration for Antsss Tattoo Marketplace
 * Tracks user behavior and business metrics
 */

import { logger } from '../monitoring/logger'

interface EventProperties {
  [key: string]: any
  user_id?: string
  session_id?: string
  platform?: string
  user_agent?: string
  page_url?: string
}

interface UserProfile {
  $first_name?: string
  $last_name?: string
  $email?: string
  $phone?: string
  $avatar?: string
  $created?: string
  user_type?: 'client' | 'artist'
  subscription_status?: string
  total_bookings?: number
  [key: string]: any
}

class MixpanelAnalytics {
  private mixpanel: any
  private isInitialized = false
  private isProduction = false
  private eventQueue: Array<{ event: string; properties: EventProperties }> = []

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.initializeMixpanel()
  }

  private async initializeMixpanel() {
    if (typeof window === 'undefined') return // Server-side, skip initialization

    try {
      const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
      if (!token) {
        logger.warn('Mixpanel token not found, analytics disabled')
        return
      }

      // Dynamically import Mixpanel to avoid SSR issues
      const mixpanelLib = await import('mixpanel-browser')
      
      mixpanelLib.default.init(token, {
        debug: !this.isProduction,
        track_pageview: false, // We'll handle this manually
        persistence: 'localStorage',
        ip: false, // Don't track IP for privacy
        api_host: 'https://api.mixpanel.com',
        loaded: (mixpanel: any) => {
          this.mixpanel = mixpanel
          this.isInitialized = true
          logger.info('Mixpanel initialized successfully')
          
          // Process queued events
          this.processEventQueue()
        },
        opt_out_tracking_by_default: false,
        property_blacklist: ['$current_url', '$initial_referrer', '$referrer'],
      })
    } catch (error) {
      logger.error('Failed to initialize Mixpanel', error as Error)
    }
  }

  private processEventQueue() {
    if (!this.isInitialized || this.eventQueue.length === 0) return

    logger.debug(`Processing ${this.eventQueue.length} queued analytics events`)

    this.eventQueue.forEach(({ event, properties }) => {
      this.mixpanel?.track(event, properties)
    })

    this.eventQueue = []
  }

  private addCommonProperties(properties: EventProperties = {}): EventProperties {
    const common: EventProperties = {
      platform: 'web',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }

    if (typeof window !== 'undefined') {
      common.page_url = window.location.href
      common.user_agent = navigator.userAgent
      common.screen_resolution = `${screen.width}x${screen.height}`
      common.viewport_size = `${window.innerWidth}x${window.innerHeight}`
    }

    return { ...common, ...properties }
  }

  // Public API
  track(event: string, properties: EventProperties = {}): void {
    const enrichedProperties = this.addCommonProperties(properties)

    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.track(event, enrichedProperties)
      logger.debug(`Analytics event tracked: ${event}`, enrichedProperties)
    } else {
      // Queue event for later processing
      this.eventQueue.push({ event, properties: enrichedProperties })
      logger.debug(`Analytics event queued: ${event}`)
    }
  }

  identify(userId: string): void {
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.identify(userId)
      logger.debug(`User identified: ${userId}`)
    }
  }

  setUserProfile(profile: UserProfile): void {
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.people.set(profile)
      logger.debug('User profile updated', { userId: profile.$email })
    }
  }

  incrementUserProperty(property: string, value: number = 1): void {
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.people.increment(property, value)
      logger.debug(`User property incremented: ${property} by ${value}`)
    }
  }

  // Business-specific tracking methods
  trackPageView(pageName: string, properties: EventProperties = {}): void {
    this.track('Page Viewed', {
      page_name: pageName,
      ...properties
    })
  }

  trackUserRegistration(method: 'email' | 'google', userType: 'client' | 'artist'): void {
    this.track('User Registered', {
      registration_method: method,
      user_type: userType,
      is_first_registration: true
    })
  }

  trackProfileCompletion(userType: 'client' | 'artist', completionPercentage: number): void {
    this.track('Profile Completed', {
      user_type: userType,
      completion_percentage: completionPercentage,
      is_profile_complete: completionPercentage >= 100
    })
  }

  trackBookingCreated(
    bookingId: string,
    artistId: string,
    serviceType: string,
    estimatedPrice?: number
  ): void {
    this.track('Booking Created', {
      booking_id: bookingId,
      artist_id: artistId,
      service_type: serviceType,
      estimated_price: estimatedPrice,
      booking_source: 'web'
    })
  }

  trackBookingStatusChange(
    bookingId: string,
    oldStatus: string,
    newStatus: string,
    userType: 'client' | 'artist'
  ): void {
    this.track('Booking Status Changed', {
      booking_id: bookingId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userType
    })
  }

  trackArtistSearch(
    query: string,
    filters: Record<string, any>,
    resultCount: number
  ): void {
    this.track('Artist Search', {
      search_query: query,
      filters_applied: Object.keys(filters).length > 0,
      filters: filters,
      result_count: resultCount
    })
  }

  trackPortfolioView(artistId: string, viewerType: 'client' | 'artist' | 'anonymous'): void {
    this.track('Portfolio Viewed', {
      artist_id: artistId,
      viewer_type: viewerType
    })
  }

  trackMessageSent(
    conversationId: string,
    messageType: 'text' | 'image' | 'booking_request',
    senderType: 'client' | 'artist'
  ): void {
    this.track('Message Sent', {
      conversation_id: conversationId,
      message_type: messageType,
      sender_type: senderType
    })
  }

  trackFileUpload(
    fileType: 'avatar' | 'portfolio' | 'document',
    fileSize: number,
    success: boolean
  ): void {
    this.track('File Upload', {
      file_type: fileType,
      file_size: fileSize,
      success: success
    })
  }

  trackError(errorType: string, errorMessage: string, userAction?: string): void {
    this.track('Error Occurred', {
      error_type: errorType,
      error_message: errorMessage,
      user_action: userAction
    })
  }

  // Conversion funnel tracking
  trackFunnelStep(
    funnelName: string,
    step: string,
    stepNumber: number,
    additionalData?: EventProperties
  ): void {
    this.track('Funnel Step', {
      funnel_name: funnelName,
      step_name: step,
      step_number: stepNumber,
      ...additionalData
    })
  }

  // Revenue tracking (for future payment integration)
  trackRevenue(
    amount: number,
    currency: string = 'USD',
    transactionId: string,
    source: 'booking' | 'subscription' | 'tip'
  ): void {
    this.track('Revenue', {
      amount: amount,
      currency: currency,
      transaction_id: transactionId,
      revenue_source: source
    })

    // Also set revenue on user profile
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.people.track_charge(amount, {
        $time: new Date().toISOString(),
        transaction_id: transactionId,
        source: source
      })
    }
  }

  // A/B Testing support
  trackExperiment(experimentName: string, variant: string): void {
    this.track('Experiment Viewed', {
      experiment_name: experimentName,
      variant: variant
    })
  }

  // Utility methods
  reset(): void {
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.reset()
      logger.debug('Mixpanel reset (user logged out)')
    }
  }

  optOut(): void {
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.opt_out_tracking()
      logger.info('User opted out of analytics tracking')
    }
  }

  optIn(): void {
    if (this.isInitialized && this.mixpanel) {
      this.mixpanel.opt_in_tracking()
      logger.info('User opted into analytics tracking')
    }
  }

  // Get distinct ID for correlation with other systems
  getDistinctId(): string | null {
    if (this.isInitialized && this.mixpanel) {
      return this.mixpanel.get_distinct_id()
    }
    return null
  }
}

// Export singleton instance
export const analytics = new MixpanelAnalytics()

// Export helper functions for common tracking patterns
export const trackUserFlow = {
  registration: {
    started: (method: 'email' | 'google') => 
      analytics.track('Registration Started', { method }),
    
    completed: (method: 'email' | 'google', userType: 'client' | 'artist') =>
      analytics.trackUserRegistration(method, userType),
    
    abandoned: (step: string) =>
      analytics.track('Registration Abandoned', { abandoned_at_step: step })
  },

  booking: {
    started: (artistId: string) =>
      analytics.track('Booking Started', { artist_id: artistId }),
    
    formFilled: (artistId: string, serviceType: string) =>
      analytics.track('Booking Form Filled', { artist_id: artistId, service_type: serviceType }),
    
    submitted: (bookingId: string, artistId: string, serviceType: string) =>
      analytics.trackBookingCreated(bookingId, artistId, serviceType),
    
    abandoned: (step: string, artistId?: string) =>
      analytics.track('Booking Abandoned', { abandoned_at_step: step, artist_id: artistId })
  },

  search: {
    started: () => analytics.track('Search Started'),
    
    performed: (query: string, filters: Record<string, any>, results: number) =>
      analytics.trackArtistSearch(query, filters, results),
    
    resultClicked: (artistId: string, position: number) =>
      analytics.track('Search Result Clicked', { artist_id: artistId, position: position })
  }
}

export type Analytics = typeof analytics