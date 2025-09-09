'use client'

import { enhancedLogger } from './enhanced-logger'
import { analytics } from './analytics'

interface SessionConfig {
  enableRecording: boolean
  enableHeatmaps: boolean
  enableScrollTracking: boolean
  enableClickTracking: boolean
  enableFormTracking: boolean
  enableErrorRecording: boolean
  sampleRate: number // 0-1, percentage of sessions to record
  maskSensitiveData: boolean
  maxSessionDuration: number // in milliseconds
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'focus' | 'blur' | 'input' | 'submit' | 'error'
  timestamp: number
  target: string
  data?: any
}

interface SessionMetrics {
  sessionId: string
  userId?: string
  startTime: number
  endTime?: number
  duration?: number
  pageViews: string[]
  interactions: UserInteraction[]
  errors: Array<{
    message: string
    stack?: string
    timestamp: number
  }>
  performance: {
    pageLoadTime?: number
    timeToInteractive?: number
    scrollDepth: number
    clickCount: number
    formSubmissions: number
  }
}

const defaultConfig: SessionConfig = {
  enableRecording: true,
  enableHeatmaps: true,
  enableScrollTracking: true,
  enableClickTracking: true,
  enableFormTracking: true,
  enableErrorRecording: true,
  sampleRate: 0.1, // Record 10% of sessions
  maskSensitiveData: true,
  maxSessionDuration: 30 * 60 * 1000, // 30 minutes
}

class SessionRecorder {
  private static instance: SessionRecorder
  private config: SessionConfig
  private sessionMetrics: SessionMetrics
  private isRecording: boolean = false
  private recordingStartTime: number = 0
  private interactions: UserInteraction[] = []
  private scrollDepth: number = 0
  private clickCount: number = 0
  private formSubmissions: number = 0
  private sensitiveSelectors = [
    'input[type="password"]',
    'input[type="email"]',
    'input[name*="card"]',
    'input[name*="cvv"]',
    'input[name*="ssn"]',
    '[data-sensitive]',
    '.sensitive-data',
  ]

  private constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.sessionMetrics = this.initializeSession()
    this.initialize()
  }

  static getInstance(config?: Partial<SessionConfig>): SessionRecorder {
    if (!SessionRecorder.instance) {
      SessionRecorder.instance = new SessionRecorder(config)
    }
    return SessionRecorder.instance
  }

  private initializeSession(): SessionMetrics {
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: [window.location.pathname],
      interactions: [],
      errors: [],
      performance: {
        scrollDepth: 0,
        clickCount: 0,
        formSubmissions: 0,
      },
    }
  }

  private initialize() {
    if (typeof window === 'undefined') return

    // Check if this session should be recorded based on sample rate
    if (Math.random() > this.config.sampleRate) {
      return
    }

    this.startRecording()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startRecording() {
    this.isRecording = true
    this.recordingStartTime = Date.now()

    enhancedLogger.logBusinessEvent('session_recording_started', {
      sessionId: this.sessionMetrics.sessionId,
      config: this.config,
    })

    if (this.config.enableClickTracking) {
      this.setupClickTracking()
    }

    if (this.config.enableScrollTracking) {
      this.setupScrollTracking()
    }

    if (this.config.enableFormTracking) {
      this.setupFormTracking()
    }

    if (this.config.enableErrorRecording) {
      this.setupErrorRecording()
    }

    // Setup page navigation tracking
    this.setupNavigationTracking()

    // Setup session cleanup
    this.setupSessionCleanup()

    // Initialize third-party session recording tools
    this.initializeThirdPartyRecording()
  }

  private setupClickTracking() {
    document.addEventListener('click', (event) => {
      if (!this.isRecording) return

      const target = event.target as HTMLElement
      const interaction: UserInteraction = {
        type: 'click',
        timestamp: Date.now(),
        target: this.getElementSelector(target),
        data: {
          x: event.clientX,
          y: event.clientY,
          button: event.button,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        },
      }

      this.recordInteraction(interaction)
      this.clickCount++

      // Track button clicks and links specially
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        analytics.track({
          name: 'element_clicked',
          properties: {
            element_type: target.tagName.toLowerCase(),
            element_text: target.textContent?.slice(0, 100),
            element_id: target.id,
            element_class: target.className,
            session_id: this.sessionMetrics.sessionId,
          },
        })
      }
    }, { passive: true })
  }

  private setupScrollTracking() {
    let maxScrollDepth = 0
    let throttleTimer: NodeJS.Timeout | null = null

    document.addEventListener('scroll', () => {
      if (!this.isRecording) return

      // Throttle scroll events
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
      }, 100)

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const currentScrollDepth = Math.round(((scrollTop + windowHeight) / documentHeight) * 100)

      if (currentScrollDepth > maxScrollDepth) {
        maxScrollDepth = currentScrollDepth
        this.scrollDepth = maxScrollDepth

        const interaction: UserInteraction = {
          type: 'scroll',
          timestamp: Date.now(),
          target: 'document',
          data: {
            scrollDepth: currentScrollDepth,
            scrollTop,
            maxScrollDepth,
          },
        }

        this.recordInteraction(interaction)

        // Track scroll milestones
        if (currentScrollDepth >= 25 && currentScrollDepth % 25 === 0) {
          analytics.track({
            name: 'scroll_milestone',
            properties: {
              depth: currentScrollDepth,
              session_id: this.sessionMetrics.sessionId,
            },
          })
        }
      }
    }, { passive: true })
  }

  private setupFormTracking() {
    // Track form focus and blur events
    document.addEventListener('focusin', (event) => {
      if (!this.isRecording) return
      
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        const interaction: UserInteraction = {
          type: 'focus',
          timestamp: Date.now(),
          target: this.getElementSelector(target),
          data: {
            elementType: target.tagName.toLowerCase(),
            inputType: (target as HTMLInputElement).type,
          },
        }
        this.recordInteraction(interaction)
      }
    }, { passive: true })

    document.addEventListener('focusout', (event) => {
      if (!this.isRecording) return
      
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        const interaction: UserInteraction = {
          type: 'blur',
          timestamp: Date.now(),
          target: this.getElementSelector(target),
        }
        this.recordInteraction(interaction)
      }
    }, { passive: true })

    // Track form submissions
    document.addEventListener('submit', (event) => {
      if (!this.isRecording) return

      const form = event.target as HTMLFormElement
      this.formSubmissions++

      const interaction: UserInteraction = {
        type: 'submit',
        timestamp: Date.now(),
        target: this.getElementSelector(form),
        data: {
          formId: form.id,
          formAction: form.action,
          formMethod: form.method,
        },
      }

      this.recordInteraction(interaction)

      analytics.track({
        name: 'form_submitted',
        properties: {
          form_id: form.id,
          form_action: form.action,
          session_id: this.sessionMetrics.sessionId,
        },
      })
    }, { passive: true })

    // Track input changes (throttled)
    let inputTimer: NodeJS.Timeout | null = null
    document.addEventListener('input', (event) => {
      if (!this.isRecording) return

      const target = event.target as HTMLInputElement
      if (!this.isSensitiveElement(target)) {
        // Throttle input tracking
        if (inputTimer) clearTimeout(inputTimer)
        inputTimer = setTimeout(() => {
          const interaction: UserInteraction = {
            type: 'input',
            timestamp: Date.now(),
            target: this.getElementSelector(target),
            data: {
              inputLength: target.value.length,
              inputType: target.type,
            },
          }
          this.recordInteraction(interaction)
        }, 500)
      }
    }, { passive: true })
  }

  private setupErrorRecording() {
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      if (!this.isRecording) return

      const error = {
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
      }

      this.sessionMetrics.errors.push(error)

      const interaction: UserInteraction = {
        type: 'error',
        timestamp: Date.now(),
        target: 'window',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      }

      this.recordInteraction(interaction)
    })

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (!this.isRecording) return

      const error = {
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
      }

      this.sessionMetrics.errors.push(error)

      const interaction: UserInteraction = {
        type: 'error',
        timestamp: Date.now(),
        target: 'promise',
        data: {
          reason: String(event.reason),
        },
      }

      this.recordInteraction(interaction)
    })
  }

  private setupNavigationTracking() {
    // Track page navigation
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      SessionRecorder.instance.trackPageView(window.location.pathname)
    }

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      SessionRecorder.instance.trackPageView(window.location.pathname)
    }

    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname)
    })
  }

  private setupSessionCleanup() {
    // Auto-stop recording after max duration
    setTimeout(() => {
      this.stopRecording('max_duration_reached')
    }, this.config.maxSessionDuration)

    // Stop recording on page unload
    window.addEventListener('beforeunload', () => {
      this.stopRecording('page_unload')
    })

    // Stop recording on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.stopRecording('page_hidden')
      }
    })
  }

  private async initializeThirdPartyRecording() {
    try {
      // Initialize LogRocket if available
      if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID && this.config.enableRecording) {
        const LogRocket = (await import('logrocket')).default
        LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID, {
          console: {
            shouldAggregateConsoleErrors: true,
          },
          network: {
            requestSanitizer: (request) => {
              // Sanitize sensitive data from requests
              if (this.config.maskSensitiveData) {
                // Remove authorization headers, etc.
                if (request.headers) {
                  delete request.headers.authorization
                  delete request.headers.cookie
                }
              }
              return request
            },
          },
        })

        // Identify user if available
        if (this.sessionMetrics.userId) {
          LogRocket.identify(this.sessionMetrics.userId)
        }
      }

      // Initialize Hotjar if available
      if (process.env.NEXT_PUBLIC_HOTJAR_ID && this.config.enableHeatmaps) {
        const script = document.createElement('script')
        script.innerHTML = `
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `
        document.head.appendChild(script)
      }

      // Initialize FullStory if available
      if (process.env.NEXT_PUBLIC_FULLSTORY_ORG_ID) {
        const script = document.createElement('script')
        script.innerHTML = `
          window['_fs_debug'] = false;
          window['_fs_host'] = 'fullstory.com';
          window['_fs_script'] = 'edge.fullstory.com/s/fs.js';
          window['_fs_org'] = '${process.env.NEXT_PUBLIC_FULLSTORY_ORG_ID}';
          window['_fs_namespace'] = 'FS';
        `
        document.head.appendChild(script)

        const fsScript = document.createElement('script')
        fsScript.src = 'https://edge.fullstory.com/s/fs.js'
        fsScript.async = true
        document.head.appendChild(fsScript)
      }

    } catch (error) {
      enhancedLogger.logError(
        error as Error,
        'external',
        { context: { message: 'Failed to initialize third-party recording tools' } }
      )
    }
  }

  private trackPageView(path: string) {
    if (!this.sessionMetrics.pageViews.includes(path)) {
      this.sessionMetrics.pageViews.push(path)
      
      analytics.track({
        name: 'page_view',
        properties: {
          path,
          session_id: this.sessionMetrics.sessionId,
          page_views_in_session: this.sessionMetrics.pageViews.length,
        },
      })
    }
  }

  private recordInteraction(interaction: UserInteraction) {
    this.interactions.push(interaction)
    this.sessionMetrics.interactions.push(interaction)

    // Limit the number of stored interactions to prevent memory issues
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-500)
    }
  }

  private getElementSelector(element: HTMLElement): string {
    if (this.config.maskSensitiveData && this.isSensitiveElement(element)) {
      return '[MASKED]'
    }

    const id = element.id ? `#${element.id}` : ''
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : ''
    const tag = element.tagName.toLowerCase()
    
    return `${tag}${id}${classes}`.slice(0, 100)
  }

  private isSensitiveElement(element: HTMLElement): boolean {
    return this.sensitiveSelectors.some(selector => {
      try {
        return element.matches(selector)
      } catch {
        return false
      }
    })
  }

  public setUserId(userId: string) {
    this.sessionMetrics.userId = userId

    // Update third-party tools
    if ((window as any).LogRocket) {
      (window as any).LogRocket.identify(userId)
    }
  }

  public stopRecording(reason: string) {
    if (!this.isRecording) return

    this.isRecording = false
    this.sessionMetrics.endTime = Date.now()
    this.sessionMetrics.duration = this.sessionMetrics.endTime - this.sessionMetrics.startTime
    this.sessionMetrics.performance = {
      ...this.sessionMetrics.performance,
      scrollDepth: this.scrollDepth,
      clickCount: this.clickCount,
      formSubmissions: this.formSubmissions,
    }

    // Send session data
    this.sendSessionData(reason)

    enhancedLogger.logBusinessEvent('session_recording_stopped', {
      sessionId: this.sessionMetrics.sessionId,
      reason,
      duration: this.sessionMetrics.duration,
      interactions: this.sessionMetrics.interactions.length,
      errors: this.sessionMetrics.errors.length,
    })
  }

  private sendSessionData(reason: string) {
    analytics.track({
      name: 'session_completed',
      properties: {
        session_id: this.sessionMetrics.sessionId,
        user_id: this.sessionMetrics.userId,
        duration: this.sessionMetrics.duration,
        page_views: this.sessionMetrics.pageViews.length,
        interactions: this.sessionMetrics.interactions.length,
        errors: this.sessionMetrics.errors.length,
        scroll_depth: this.scrollDepth,
        click_count: this.clickCount,
        form_submissions: this.formSubmissions,
        end_reason: reason,
      },
    })
  }

  public getSessionMetrics(): SessionMetrics {
    return { ...this.sessionMetrics }
  }
}

// Export singleton instance
export const sessionRecorder = SessionRecorder.getInstance()

// Export utility function
export function identifyUser(userId: string) {
  sessionRecorder.setUserId(userId)
}