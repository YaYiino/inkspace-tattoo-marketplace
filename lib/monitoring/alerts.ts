/**
 * Production alerting system for Antsss Tattoo Marketplace
 * Handles various alert channels and notification types
 */

import { logger } from './logger'

export interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  source: string
  timestamp: Date
  metadata?: Record<string, any>
  resolved?: boolean
  resolvedAt?: Date
}

export interface AlertChannel {
  name: string
  enabled: boolean
  sendAlert: (alert: Alert) => Promise<boolean>
}

class AlertManager {
  private channels: Map<string, AlertChannel> = new Map()
  private alertHistory: Alert[] = []
  private rateLimits: Map<string, number> = new Map()

  constructor() {
    this.setupDefaultChannels()
  }

  private setupDefaultChannels() {
    // Email channel
    this.addChannel('email', {
      name: 'email',
      enabled: true,
      sendAlert: this.sendEmailAlert.bind(this)
    })

    // Slack channel
    this.addChannel('slack', {
      name: 'slack',
      enabled: !!process.env.SLACK_ALERT_WEBHOOK,
      sendAlert: this.sendSlackAlert.bind(this)
    })

    // SMS channel (for critical alerts)
    this.addChannel('sms', {
      name: 'sms',
      enabled: !!process.env.TWILIO_ACCOUNT_SID,
      sendAlert: this.sendSMSAlert.bind(this)
    })

    // Webhook channel
    this.addChannel('webhook', {
      name: 'webhook',
      enabled: !!process.env.ALERT_WEBHOOK_URL,
      sendAlert: this.sendWebhookAlert.bind(this)
    })
  }

  addChannel(name: string, channel: AlertChannel) {
    this.channels.set(name, channel)
    logger.info(`Alert channel added: ${name}`)
  }

  private isRateLimited(alertKey: string): boolean {
    const now = Date.now()
    const lastSent = this.rateLimits.get(alertKey) || 0
    const cooldownPeriod = 5 * 60 * 1000 // 5 minutes

    if (now - lastSent < cooldownPeriod) {
      return true
    }

    this.rateLimits.set(alertKey, now)
    return false
  }

  async sendAlert(alert: Alert, channels?: string[]): Promise<void> {
    // Rate limiting to prevent spam
    const alertKey = `${alert.source}-${alert.title}`
    if (this.isRateLimited(alertKey)) {
      logger.debug(`Alert rate limited: ${alertKey}`)
      return
    }

    // Add to history
    this.alertHistory.push(alert)

    // Determine which channels to use
    const targetChannels = channels || this.getChannelsForSeverity(alert.severity)

    logger.info(`Sending ${alert.severity} alert: ${alert.title}`, {
      channels: targetChannels,
      source: alert.source
    })

    // Send to each channel
    const promises = targetChannels.map(async (channelName) => {
      const channel = this.channels.get(channelName)
      if (!channel || !channel.enabled) {
        logger.warn(`Alert channel not available: ${channelName}`)
        return false
      }

      try {
        const success = await channel.sendAlert(alert)
        if (success) {
          logger.debug(`Alert sent successfully to ${channelName}`)
        } else {
          logger.error(`Failed to send alert to ${channelName}`)
        }
        return success
      } catch (error) {
        logger.error(`Error sending alert to ${channelName}`, error as Error)
        return false
      }
    })

    await Promise.all(promises)
  }

  private getChannelsForSeverity(severity: Alert['severity']): string[] {
    switch (severity) {
      case 'critical':
        return ['email', 'slack', 'sms', 'webhook']
      case 'high':
        return ['email', 'slack', 'webhook']
      case 'medium':
        return ['slack', 'webhook']
      case 'low':
        return ['webhook']
      default:
        return ['webhook']
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<boolean> {
    // Email implementation using your preferred email service
    try {
      const emailBody = this.formatEmailAlert(alert)
      
      // Replace with your email service implementation
      if (process.env.SMTP_HOST) {
        // Use nodemailer or similar
        const response = await fetch('/api/send-alert-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: process.env.ALERT_EMAIL || 'alerts@antsss.com',
            subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
            html: emailBody
          })
        })

        return response.ok
      }

      return false
    } catch (error) {
      logger.error('Failed to send email alert', error as Error)
      return false
    }
  }

  private async sendSlackAlert(alert: Alert): Promise<boolean> {
    if (!process.env.SLACK_ALERT_WEBHOOK) return false

    try {
      const slackMessage = this.formatSlackAlert(alert)
      
      const response = await fetch(process.env.SLACK_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      })

      return response.ok
    } catch (error) {
      logger.error('Failed to send Slack alert', error as Error)
      return false
    }
  }

  private async sendSMSAlert(alert: Alert): Promise<boolean> {
    // Only send SMS for critical alerts
    if (alert.severity !== 'critical') return true

    try {
      // Implementation using Twilio or similar service
      if (process.env.TWILIO_ACCOUNT_SID && process.env.ALERT_PHONE) {
        const response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: process.env.ALERT_PHONE,
            message: `CRITICAL: ${alert.title} - ${alert.message}`
          })
        })

        return response.ok
      }

      return false
    } catch (error) {
      logger.error('Failed to send SMS alert', error as Error)
      return false
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<boolean> {
    if (!process.env.ALERT_WEBHOOK_URL) return false

    try {
      const response = await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'antsss-tattoo-marketplace'
        })
      })

      return response.ok
    } catch (error) {
      logger.error('Failed to send webhook alert', error as Error)
      return false
    }
  }

  private formatEmailAlert(alert: Alert): string {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    }

    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <div style="border-left: 4px solid ${severityColors[alert.severity]}; padding: 20px; background: #f8f9fa;">
            <h2 style="margin-top: 0; color: ${severityColors[alert.severity]};">
              🚨 ${alert.severity.toUpperCase()} ALERT
            </h2>
            <h3>${alert.title}</h3>
            <p><strong>Source:</strong> ${alert.source}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            ${alert.metadata ? `
              <details>
                <summary>Additional Information</summary>
                <pre style="background: #e9ecef; padding: 10px; border-radius: 4px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
              </details>
            ` : ''}
            <hr>
            <p style="font-size: 0.9em; color: #6c757d;">
              This alert was sent from the Antsss Tattoo Marketplace monitoring system.
              <br>
              Alert ID: ${alert.id}
            </p>
          </div>
        </body>
      </html>
    `
  }

  private formatSlackAlert(alert: Alert) {
    const severityEmojis = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    }

    const severityColors = {
      low: 'good',
      medium: 'warning',
      high: 'danger',
      critical: 'danger'
    }

    return {
      text: `${severityEmojis[alert.severity]} ${alert.severity.toUpperCase()} Alert: ${alert.title}`,
      attachments: [
        {
          color: severityColors[alert.severity],
          fields: [
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp.toLocaleString(),
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            }
          ],
          footer: 'Antsss Monitoring',
          footer_icon: 'https://antsss.com/favicon.ico',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    }
  }

  // Predefined alert methods for common scenarios
  async systemError(error: Error, source: string, metadata?: Record<string, any>) {
    await this.sendAlert({
      id: `error-${Date.now()}`,
      severity: 'high',
      title: 'System Error Detected',
      message: error.message,
      source,
      timestamp: new Date(),
      metadata: {
        stack: error.stack,
        ...metadata
      }
    })
  }

  async performanceAlert(metric: string, value: number, threshold: number, source: string) {
    await this.sendAlert({
      id: `perf-${Date.now()}`,
      severity: value > threshold * 2 ? 'high' : 'medium',
      title: 'Performance Threshold Exceeded',
      message: `${metric} is ${value} (threshold: ${threshold})`,
      source,
      timestamp: new Date(),
      metadata: { metric, value, threshold }
    })
  }

  async securityAlert(event: string, details: Record<string, any>, source: string) {
    await this.sendAlert({
      id: `sec-${Date.now()}`,
      severity: 'critical',
      title: 'Security Event Detected',
      message: event,
      source,
      timestamp: new Date(),
      metadata: details
    })
  }

  async businessAlert(metric: string, value: number, expected: number, source: string) {
    const severity = Math.abs(value - expected) / expected > 0.5 ? 'high' : 'medium'
    
    await this.sendAlert({
      id: `biz-${Date.now()}`,
      severity,
      title: 'Business Metric Alert',
      message: `${metric} is ${value} (expected: ${expected})`,
      source,
      timestamp: new Date(),
      metadata: { metric, value, expected, deviation: value - expected }
    })
  }

  async uptimeAlert(service: string, isDown: boolean, duration?: number) {
    if (isDown) {
      await this.sendAlert({
        id: `uptime-${Date.now()}`,
        severity: 'critical',
        title: 'Service Down',
        message: `${service} is not responding`,
        source: 'uptime-monitor',
        timestamp: new Date(),
        metadata: { service, status: 'down' }
      })
    } else if (duration) {
      await this.sendAlert({
        id: `recovery-${Date.now()}`,
        severity: 'medium',
        title: 'Service Recovered',
        message: `${service} is back online after ${duration}ms`,
        source: 'uptime-monitor',
        timestamp: new Date(),
        metadata: { service, status: 'recovered', downtime: duration }
      })
    }
  }

  // Alert history and management
  getRecentAlerts(hours = 24): Alert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.alertHistory.filter(alert => alert.timestamp >= cutoff)
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      logger.info(`Alert resolved: ${alertId}`)
      return true
    }
    return false
  }

  getAlertStats() {
    const recent = this.getRecentAlerts()
    const stats = {
      total: recent.length,
      critical: recent.filter(a => a.severity === 'critical').length,
      high: recent.filter(a => a.severity === 'high').length,
      medium: recent.filter(a => a.severity === 'medium').length,
      low: recent.filter(a => a.severity === 'low').length,
      resolved: recent.filter(a => a.resolved).length,
      unresolved: recent.filter(a => !a.resolved).length
    }

    return stats
  }
}

// Export singleton instance
export const alertManager = new AlertManager()

// Export convenience functions
export const alerts = {
  system: (error: Error, source: string, metadata?: Record<string, any>) =>
    alertManager.systemError(error, source, metadata),
  
  performance: (metric: string, value: number, threshold: number, source: string) =>
    alertManager.performanceAlert(metric, value, threshold, source),
  
  security: (event: string, details: Record<string, any>, source: string) =>
    alertManager.securityAlert(event, details, source),
  
  business: (metric: string, value: number, expected: number, source: string) =>
    alertManager.businessAlert(metric, value, expected, source),
  
  uptime: (service: string, isDown: boolean, duration?: number) =>
    alertManager.uptimeAlert(service, isDown, duration),
  
  custom: (alert: Omit<Alert, 'timestamp'>) =>
    alertManager.sendAlert({ ...alert, timestamp: new Date() })
}

export type AlertManager = typeof alertManager