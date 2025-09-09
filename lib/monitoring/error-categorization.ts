import { enhancedLogger } from './enhanced-logger'
import { analytics } from './analytics'

export interface ErrorCategory {
  id: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  autoAssign: boolean
  patterns: Array<{
    type: 'message' | 'stack' | 'name' | 'context'
    pattern: string | RegExp
    weight: number
  }>
  actions: Array<{
    type: 'alert' | 'create_issue' | 'auto_fix' | 'ignore'
    condition?: string
    config: Record<string, any>
  }>
}

export interface CategorizedError {
  id: string
  originalError: Error
  category: ErrorCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  frequency: number
  firstSeen: Date
  lastSeen: Date
  affectedUsers: Set<string>
  context: Record<string, any>
  status: 'new' | 'investigating' | 'resolved' | 'ignored'
  assignedTo?: string
  resolution?: {
    action: string
    description: string
    timestamp: Date
    resolvedBy: string
  }
}

const errorCategories: ErrorCategory[] = [
  {
    id: 'auth_errors',
    name: 'Authentication Errors',
    description: 'User authentication and authorization failures',
    priority: 'high',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /authentication|unauthorized|forbidden|invalid.*token/i, weight: 0.8 },
      { type: 'name', pattern: /AuthenticationError|AuthorizationError/i, weight: 0.9 },
      { type: 'context', pattern: 'auth', weight: 0.7 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['security', 'backend'], immediate: true } },
      { type: 'create_issue', config: { project: 'auth', priority: 'high' } },
    ],
  },
  {
    id: 'payment_errors',
    name: 'Payment Processing Errors',
    description: 'Issues with payment processing and billing',
    priority: 'critical',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /payment|billing|charge.*failed|card.*declined/i, weight: 0.9 },
      { type: 'context', pattern: /payment|stripe|paypal/i, weight: 0.8 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['finance', 'backend'], immediate: true } },
      { type: 'create_issue', config: { project: 'payments', priority: 'critical' } },
    ],
  },
  {
    id: 'database_errors',
    name: 'Database Errors',
    description: 'Database connection and query issues',
    priority: 'high',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /database|connection.*timeout|query.*failed|supabase/i, weight: 0.8 },
      { type: 'name', pattern: /DatabaseError|QueryError/i, weight: 0.9 },
      { type: 'context', pattern: 'database', weight: 0.7 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['backend', 'infrastructure'], immediate: true } },
      { type: 'create_issue', config: { project: 'database', priority: 'high' } },
    ],
  },
  {
    id: 'api_errors',
    name: 'API Errors',
    description: 'REST API and GraphQL errors',
    priority: 'medium',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /api.*error|http.*error|fetch.*failed/i, weight: 0.7 },
      { type: 'context', pattern: 'api', weight: 0.8 },
      { type: 'name', pattern: /ApiError|HttpError/i, weight: 0.8 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['backend'], immediate: false } },
      { type: 'create_issue', condition: 'frequency > 10', config: { project: 'api' } },
    ],
  },
  {
    id: 'ui_errors',
    name: 'UI/Frontend Errors',
    description: 'React components and frontend JavaScript errors',
    priority: 'medium',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /react|component|render|hook/i, weight: 0.6 },
      { type: 'name', pattern: /ChunkLoadError|ReferenceError|TypeError/i, weight: 0.5 },
      { type: 'context', pattern: 'ui', weight: 0.7 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['frontend'], immediate: false } },
      { type: 'create_issue', condition: 'affectedUsers > 5', config: { project: 'frontend' } },
    ],
  },
  {
    id: 'external_service_errors',
    name: 'External Service Errors',
    description: 'Third-party service integration failures',
    priority: 'medium',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /external.*service|third.*party|integration/i, weight: 0.7 },
      { type: 'name', pattern: /ExternalServiceError/i, weight: 0.9 },
      { type: 'context', pattern: /external|integration/i, weight: 0.8 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['backend'], immediate: false } },
      { type: 'create_issue', condition: 'frequency > 5', config: { project: 'integrations' } },
    ],
  },
  {
    id: 'performance_errors',
    name: 'Performance Issues',
    description: 'Slow queries, timeouts, and performance degradation',
    priority: 'medium',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /timeout|slow|performance|memory/i, weight: 0.6 },
      { type: 'context', pattern: 'performance', weight: 0.9 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['performance'], immediate: false } },
      { type: 'create_issue', condition: 'frequency > 20', config: { project: 'performance' } },
    ],
  },
  {
    id: 'security_errors',
    name: 'Security Violations',
    description: 'Security-related errors and potential threats',
    priority: 'critical',
    autoAssign: true,
    patterns: [
      { type: 'message', pattern: /security|xss|csrf|injection|malicious/i, weight: 0.9 },
      { type: 'context', pattern: 'security', weight: 0.9 },
    ],
    actions: [
      { type: 'alert', config: { channels: ['security'], immediate: true } },
      { type: 'create_issue', config: { project: 'security', priority: 'critical' } },
    ],
  },
]

class ErrorCategorizationService {
  private static instance: ErrorCategorizationService
  private categorizedErrors: Map<string, CategorizedError> = new Map()
  private categories: ErrorCategory[] = errorCategories

  private constructor() {}

  static getInstance(): ErrorCategorizationService {
    if (!ErrorCategorizationService.instance) {
      ErrorCategorizationService.instance = new ErrorCategorizationService()
    }
    return ErrorCategorizationService.instance
  }

  categorizeError(
    error: Error,
    context: Record<string, any> = {},
    userId?: string
  ): CategorizedError {
    // Generate error fingerprint
    const fingerprint = this.generateFingerprint(error, context)
    
    // Check if we've seen this error before
    const existingError = this.categorizedErrors.get(fingerprint)
    if (existingError) {
      return this.updateExistingError(existingError, userId)
    }

    // Categorize new error
    const category = this.findMatchingCategory(error, context)
    const severity = this.determineSeverity(error, context, category)

    const categorizedError: CategorizedError = {
      id: fingerprint,
      originalError: error,
      category,
      severity,
      frequency: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
      affectedUsers: new Set(userId ? [userId] : []),
      context,
      status: 'new',
    }

    this.categorizedErrors.set(fingerprint, categorizedError)

    // Execute category actions
    this.executeActions(categorizedError)

    // Log categorization
    enhancedLogger.logBusinessEvent('error_categorized', {
      errorId: fingerprint,
      category: category.name,
      severity,
      isNew: true,
    })

    return categorizedError
  }

  private generateFingerprint(error: Error, context: Record<string, any>): string {
    const components = [
      error.name,
      error.message.replace(/\d+/g, 'N').replace(/[a-f0-9]{8,}/gi, 'HEX'), // Normalize IDs
      context.path || '',
      context.userId ? 'user' : 'anonymous', // Anonymize user
    ]
    
    const fingerprint = components.join('|')
    return btoa(fingerprint).substr(0, 16)
  }

  private findMatchingCategory(error: Error, context: Record<string, any>): ErrorCategory {
    let bestMatch: ErrorCategory | null = null
    let highestScore = 0

    for (const category of this.categories) {
      let score = 0

      for (const pattern of category.patterns) {
        let matches = false

        switch (pattern.type) {
          case 'message':
            matches = this.testPattern(error.message, pattern.pattern)
            break
          case 'name':
            matches = this.testPattern(error.name, pattern.pattern)
            break
          case 'stack':
            matches = this.testPattern(error.stack || '', pattern.pattern)
            break
          case 'context':
            matches = this.testPattern(JSON.stringify(context), pattern.pattern)
            break
        }

        if (matches) {
          score += pattern.weight
        }
      }

      if (score > highestScore) {
        highestScore = score
        bestMatch = category
      }
    }

    // Return default category if no match found
    return bestMatch || {
      id: 'uncategorized',
      name: 'Uncategorized Errors',
      description: 'Errors that don\'t match any specific category',
      priority: 'medium',
      autoAssign: false,
      patterns: [],
      actions: [
        { type: 'create_issue', config: { project: 'general' } },
      ],
    }
  }

  private testPattern(text: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(text)
    }
    return text.toLowerCase().includes(pattern.toLowerCase())
  }

  private determineSeverity(
    error: Error,
    context: Record<string, any>,
    category: ErrorCategory
  ): CategorizedError['severity'] {
    // Base severity from category
    let severity = category.priority

    // Adjust based on context
    if (context.userId) {
      // User-affecting errors are more severe
      if (severity === 'low') severity = 'medium'
    }

    if (context.production && process.env.NODE_ENV === 'production') {
      // Production errors are more severe
      if (severity === 'low') severity = 'medium'
      if (severity === 'medium') severity = 'high'
    }

    // Specific error patterns that increase severity
    if (error.message.includes('payment') || error.message.includes('billing')) {
      return 'critical'
    }

    if (error.message.includes('security') || error.message.includes('unauthorized')) {
      return 'high'
    }

    return severity
  }

  private updateExistingError(
    existingError: CategorizedError,
    userId?: string
  ): CategorizedError {
    existingError.frequency += 1
    existingError.lastSeen = new Date()
    
    if (userId) {
      existingError.affectedUsers.add(userId)
    }

    // Re-evaluate severity based on frequency and user impact
    const userCount = existingError.affectedUsers.size
    if (userCount > 10 || existingError.frequency > 50) {
      if (existingError.severity === 'low') existingError.severity = 'medium'
      if (existingError.severity === 'medium') existingError.severity = 'high'
    }

    // Check if we need to execute actions again
    this.executeActions(existingError, false)

    return existingError
  }

  private executeActions(categorizedError: CategorizedError, isNew: boolean = true) {
    for (const action of categorizedError.category.actions) {
      // Check condition if specified
      if (action.condition && !this.evaluateCondition(action.condition, categorizedError)) {
        continue
      }

      switch (action.type) {
        case 'alert':
          this.sendAlert(categorizedError, action.config)
          break
        case 'create_issue':
          if (isNew) { // Only create issues for new errors
            this.createIssue(categorizedError, action.config)
          }
          break
        case 'auto_fix':
          this.attemptAutoFix(categorizedError, action.config)
          break
        case 'ignore':
          this.ignoreError(categorizedError)
          break
      }
    }
  }

  private evaluateCondition(condition: string, error: CategorizedError): boolean {
    try {
      // Simple condition evaluator
      const context = {
        frequency: error.frequency,
        affectedUsers: error.affectedUsers.size,
        severity: error.severity,
      }
      
      // Replace variables in condition
      const evaluableCondition = condition.replace(/(\w+)/g, (match) => {
        return context.hasOwnProperty(match) ? String(context[match as keyof typeof context]) : match
      })
      
      return eval(evaluableCondition)
    } catch {
      return false
    }
  }

  private sendAlert(error: CategorizedError, config: Record<string, any>) {
    enhancedLogger.logBusinessEvent('error_alert_sent', {
      errorId: error.id,
      category: error.category.name,
      severity: error.severity,
      channels: config.channels,
      immediate: config.immediate,
    })

    // In a real implementation, this would send to Slack, Discord, email, etc.
    if (config.immediate && error.severity === 'critical') {
      // Send immediate notifications
      analytics.track({
        name: 'critical_error_alert',
        properties: {
          error_id: error.id,
          category: error.category.name,
          frequency: error.frequency,
          affected_users: error.affectedUsers.size,
        },
      })
    }
  }

  private createIssue(error: CategorizedError, config: Record<string, any>) {
    enhancedLogger.logBusinessEvent('error_issue_created', {
      errorId: error.id,
      category: error.category.name,
      project: config.project,
      priority: config.priority || error.severity,
    })

    // In a real implementation, this would create issues in Jira, GitHub, etc.
    const issueData = {
      title: `${error.category.name}: ${error.originalError.message}`,
      description: this.generateIssueDescription(error),
      project: config.project,
      priority: config.priority || error.severity,
      labels: [error.category.id, error.severity],
    }

    analytics.track({
      name: 'error_issue_created',
      properties: {
        error_id: error.id,
        project: config.project,
        priority: issueData.priority,
      },
    })
  }

  private generateIssueDescription(error: CategorizedError): string {
    return `
## Error Details
- **Category**: ${error.category.name}
- **Severity**: ${error.severity}
- **Frequency**: ${error.frequency}
- **Affected Users**: ${error.affectedUsers.size}
- **First Seen**: ${error.firstSeen.toISOString()}
- **Last Seen**: ${error.lastSeen.toISOString()}

## Error Message
\`\`\`
${error.originalError.message}
\`\`\`

## Stack Trace
\`\`\`
${error.originalError.stack}
\`\`\`

## Context
\`\`\`json
${JSON.stringify(error.context, null, 2)}
\`\`\`

## Reproduction
1. Visit the page where this error occurred
2. Perform the action that triggered the error
3. Check browser console for additional details

## Investigation Steps
- [ ] Reproduce the error in development environment
- [ ] Check related logs and metrics
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Test fix
- [ ] Deploy to production
- [ ] Verify resolution
    `
  }

  private attemptAutoFix(error: CategorizedError, config: Record<string, any>) {
    // Placeholder for auto-fix logic
    enhancedLogger.logBusinessEvent('error_auto_fix_attempted', {
      errorId: error.id,
      category: error.category.name,
      fixType: config.fixType,
    })
  }

  private ignoreError(error: CategorizedError) {
    error.status = 'ignored'
    enhancedLogger.logBusinessEvent('error_ignored', {
      errorId: error.id,
      category: error.category.name,
    })
  }

  // Public methods for error management
  public getErrorStats(): Record<string, any> {
    const stats = {
      total: this.categorizedErrors.size,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recentErrors: [] as CategorizedError[],
    }

    for (const error of this.categorizedErrors.values()) {
      stats.byCategory[error.category.name] = (stats.byCategory[error.category.name] || 0) + 1
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1
      stats.byStatus[error.status] = (stats.byStatus[error.status] || 0) + 1
    }

    stats.recentErrors = Array.from(this.categorizedErrors.values())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, 10)

    return stats
  }

  public resolveError(errorId: string, resolution: CategorizedError['resolution']) {
    const error = this.categorizedErrors.get(errorId)
    if (error) {
      error.status = 'resolved'
      error.resolution = resolution

      enhancedLogger.logBusinessEvent('error_resolved', {
        errorId,
        resolvedBy: resolution.resolvedBy,
        action: resolution.action,
      })

      analytics.track({
        name: 'error_resolved',
        properties: {
          error_id: errorId,
          category: error.category.name,
          resolution_action: resolution.action,
        },
      })
    }
  }

  public getCategorizedError(errorId: string): CategorizedError | undefined {
    return this.categorizedErrors.get(errorId)
  }

  public getAllErrors(): CategorizedError[] {
    return Array.from(this.categorizedErrors.values())
  }
}

export const errorCategorization = ErrorCategorizationService.getInstance()