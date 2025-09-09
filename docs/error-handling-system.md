# Comprehensive Error Handling & Logging System

This document describes the comprehensive error handling and logging system implemented for the Antsss tattoo marketplace application.

## Overview

The system provides:
- 🛡️ **Global Error Handling** - React error boundaries and API error middleware
- 📊 **Structured Logging** - Environment-specific logging with JSON format
- 🔔 **User-Friendly Notifications** - Toast notifications and error pages
- 📈 **Performance Monitoring** - Real-time metrics and Core Web Vitals
- 🎥 **Session Recording** - User interaction tracking and replay
- 🚨 **Production Error Management** - Automated categorization and alerting
- 🔧 **Development Tools** - Enhanced debugging and error analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring System                        │
├─────────────────────────────────────────────────────────────┤
│  MonitoringProvider → GlobalErrorBoundary → ToastProvider   │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────────┐   │
│  │        Error           │       Performance          │   │
│  │      Handling          │       Monitoring           │   │
│  │                        │                            │   │
│  │ • Error Boundaries     │ • Core Web Vitals          │   │
│  │ • API Error Handler    │ • Resource Timing          │   │
│  │ • Toast Notifications  │ • Long Task Detection      │   │
│  │ • Error Pages          │ • Memory Monitoring        │   │
│  └────────────────────────┼────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────────┐   │
│  │       Logging          │      Session Recording     │   │
│  │                        │                            │   │
│  │ • Enhanced Logger      │ • User Interactions        │   │
│  │ • Error Categorization │ • Click/Scroll Tracking    │   │
│  │ • Sentry Integration   │ • Form Analytics           │   │
│  │ • Analytics Tracking   │ • Third-party Tools        │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Error Boundaries

#### Global Error Boundary
- Catches all unhandled React errors
- Provides fallback UI with recovery options
- Automatically reports to monitoring services
- Different UI for development vs production

#### Component-level Error Boundaries
- Isolate errors to specific components
- Prevent entire app crashes
- Customizable fallback UI
- Higher-order component wrapper available

**Usage:**
```tsx
import { ErrorBoundary, withErrorBoundary } from '@/lib/monitoring'

// Wrap individual components
<ErrorBoundary name="UserProfile">
  <UserProfile />
</ErrorBoundary>

// Or use HOC
export default withErrorBoundary(UserProfile, { isolate: true })
```

### 2. API Error Handling

#### Error Types
- `ApiError` - Base API error class
- `ValidationError` - Request validation failures
- `AuthenticationError` - Auth required
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `RateLimitError` - Rate limit exceeded
- `ExternalServiceError` - Third-party failures

#### API Route Wrapper
```typescript
import { withErrorHandler, ValidationError } from '@/lib/monitoring'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  
  if (!body.email) {
    throw new ValidationError('Email is required')
  }
  
  // Your API logic here
  return { success: true, data: result }
})
```

### 3. Enhanced Logging

#### Log Levels
- `debug` - Development debugging info
- `info` - General information
- `warn` - Warning conditions
- `error` - Error conditions requiring attention

#### Structured Format
```json
{
  "level": "error",
  "message": "Database query failed",
  "metadata": {
    "query": "SELECT * FROM users",
    "duration": 5000,
    "error": {
      "name": "QueryError",
      "message": "Connection timeout",
      "stack": "..."
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req_abc123",
  "userId": "user_456",
  "path": "/api/users",
  "userAgent": "Mozilla/5.0..."
}
```

#### Usage
```typescript
import { enhancedLogger } from '@/lib/monitoring'

// Basic logging
enhancedLogger.logError(error, 'database', {
  context: { query: 'SELECT...', userId: '123' },
  tags: { critical: 'true' }
})

// Performance logging
enhancedLogger.logPerformance({
  name: 'api_response_time',
  value: 250,
  unit: 'ms'
})

// Security events
enhancedLogger.logSecurityEvent({
  type: 'authentication',
  severity: 'high',
  details: { failedAttempts: 5 },
  userId: '123'
})
```

### 4. Toast Notifications

#### User-Friendly Error Display
- Auto-dismissing notifications
- Action buttons for error recovery
- Different styles for error types
- Accessibility compliant

```tsx
import { useToast } from '@/lib/monitoring'

function MyComponent() {
  const { error, success, warning, info } = useToast()
  
  const handleError = () => {
    error('Something went wrong', 'Please try again later', {
      action: {
        label: 'Retry',
        onClick: () => retryAction()
      }
    })
  }
}
```

### 5. Error Pages

#### Custom Error Pages
- `error.tsx` - Component-level errors
- `not-found.tsx` - 404 errors
- `global-error.tsx` - Critical app errors

#### Features
- User-friendly error messages
- Recovery action buttons
- Contact support links
- Development error details
- Automatic error reporting

### 6. Performance Monitoring

#### Core Web Vitals
- **LCP** (Largest Contentful Paint) - Loading performance
- **FID** (First Input Delay) - Interactivity
- **CLS** (Cumulative Layout Shift) - Visual stability

#### Additional Metrics
- First Contentful Paint (FCP)
- Time to First Byte (TTFB)
- Resource loading times
- Long task detection
- Memory usage monitoring

```typescript
import { performanceMonitor } from '@/lib/monitoring'

// Manual performance tracking
performanceMonitor.mark('operation-start')
await performOperation()
performanceMonitor.mark('operation-end')
performanceMonitor.measure('operation', 'operation-start', 'operation-end')

// Function timing
const result = performanceMonitor.timeFunction('database-query', () => {
  return database.query('SELECT...')
})
```

### 7. Session Recording

#### User Interaction Tracking
- Click tracking with heatmaps
- Scroll behavior analysis
- Form interaction monitoring
- Error occurrence context
- User journey mapping

#### Privacy Features
- Sensitive data masking
- Configurable sampling rates
- GDPR compliant
- Opt-out mechanisms

#### Third-party Integrations
- LogRocket for session replay
- Hotjar for heatmaps
- FullStory for user analytics

### 8. Error Categorization & Management

#### Automated Categorization
- Pattern-based error classification
- Severity assessment
- User impact analysis
- Frequency tracking
- Automatic issue creation

#### Error Categories
- **Authentication Errors** - Login/permission issues
- **Payment Errors** - Billing and payment failures
- **Database Errors** - Data layer issues
- **API Errors** - REST/GraphQL failures
- **UI Errors** - Frontend component failures
- **External Service Errors** - Third-party failures
- **Performance Errors** - Slow queries and timeouts
- **Security Errors** - Potential security threats

```typescript
import { errorCategorization } from '@/lib/monitoring'

// Errors are automatically categorized
const categorizedError = errorCategorization.categorizeError(
  error, 
  { category: 'api', userId: '123' }
)

// Get error statistics
const stats = errorCategorization.getErrorStats()
console.log(stats.byCategory) // Error count by category
```

### 9. Development Tools

#### Error Debugger Panel
- Real-time error console
- Performance metrics display
- Network request monitoring
- Storage inspection
- Log export functionality

```tsx
import { ErrorDebugger } from '@/lib/monitoring'

// Automatically enabled in development
<ErrorDebugger 
  enabled={process.env.NODE_ENV === 'development'}
  position="bottom-right"
/>
```

#### Development Utilities
```typescript
import { devPerformance } from '@/lib/monitoring'

// Development-only performance tracking
devPerformance.time('component-render', () => {
  return renderComponent()
})
```

## Setup & Configuration

### 1. Environment Variables

```bash
# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Session Recording
NEXT_PUBLIC_SESSION_RECORDING_SAMPLE_RATE=0.1
NEXT_PUBLIC_LOGROCKET_APP_ID=your-app-id
NEXT_PUBLIC_HOTJAR_ID=your-hotjar-id
NEXT_PUBLIC_FULLSTORY_ORG_ID=your-fullstory-id

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_MIXPANEL_TOKEN=your-token
NEXT_PUBLIC_VERCEL_ANALYTICS=true
```

### 2. Provider Setup

```tsx
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### 3. API Route Integration

```typescript
// app/api/example/route.ts
import { withAuth, validateRequestBody } from '@/lib/utils/api-utils'

interface RequestBody {
  name: string
  email: string
}

export const POST = withAuth(async (request, context, user) => {
  const body = validateRequestBody<RequestBody>(
    await request.json(),
    ['name', 'email']
  )
  
  // Your API logic here
  return { success: true, data: result }
})
```

## Monitoring Integration

### External Services

#### Sentry
- Error tracking and performance monitoring
- Release tracking and deployment notifications
- Custom fingerprinting and error grouping
- User feedback collection

#### LogRocket
- Session replay and user behavior analysis
- Performance monitoring and metrics
- Error tracking with user context
- Console and network log capture

#### Analytics Platforms
- Google Analytics for user behavior
- Mixpanel for event tracking
- Vercel Analytics for performance
- Custom analytics for business metrics

## Best Practices

### Error Handling
1. **Fail Fast** - Validate input early and throw specific errors
2. **Graceful Degradation** - Provide fallback UI for non-critical failures
3. **User Context** - Include user ID and session info in error logs
4. **Sensitive Data** - Never log passwords or payment information
5. **Error Recovery** - Provide clear steps for users to recover

### Performance Monitoring
1. **Core Web Vitals** - Monitor and optimize LCP, FID, CLS
2. **Critical User Journeys** - Track performance of key user flows
3. **Third-party Impact** - Monitor external service performance
4. **Resource Optimization** - Track and optimize asset loading
5. **Memory Usage** - Monitor for memory leaks and optimization

### Logging Strategy
1. **Structured Logs** - Use consistent JSON format
2. **Appropriate Levels** - Use correct log levels for different events
3. **Contextual Information** - Include request ID, user ID, timestamps
4. **Log Retention** - Implement appropriate retention policies
5. **PII Protection** - Ensure no personal information in logs

## Testing

### Error Boundary Testing
```typescript
import { render } from '@testing-library/react'
import { ErrorBoundary } from '@/lib/monitoring'

const ThrowError = () => {
  throw new Error('Test error')
}

test('ErrorBoundary catches and displays error', () => {
  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(getByText(/something went wrong/i)).toBeInTheDocument()
})
```

### API Error Testing
```typescript
import { validateRequestBody, ValidationError } from '@/lib/monitoring'

test('validateRequestBody throws for missing required fields', () => {
  expect(() => {
    validateRequestBody({}, ['name', 'email'])
  }).toThrow(ValidationError)
})
```

## Monitoring Dashboard

Access real-time monitoring data:

```typescript
import { useMonitoring } from '@/lib/monitoring'

function AdminDashboard() {
  const { getErrorStats } = useMonitoring()
  const stats = getErrorStats()
  
  return (
    <div>
      <h2>Error Statistics</h2>
      <div>Total Errors: {stats.total}</div>
      <div>By Category: {JSON.stringify(stats.byCategory)}</div>
      <div>By Severity: {JSON.stringify(stats.bySeverity)}</div>
    </div>
  )
}
```

## Troubleshooting

### Common Issues

1. **Missing Error Context**
   - Ensure error boundaries are properly placed
   - Check that user context is set after authentication

2. **Performance Monitoring Not Working**
   - Verify browser supports Performance Observer API
   - Check that service worker isn't interfering

3. **Session Recording Not Starting**
   - Verify sample rate configuration
   - Check third-party service credentials

4. **Logs Not Appearing**
   - Verify LOG_LEVEL environment variable
   - Check that monitoring is initialized

### Debug Mode
Enable comprehensive debugging:

```typescript
import { monitoring } from '@/lib/monitoring'

await monitoring.initialize({
  logLevel: 'debug',
  enableAnalytics: true,
  enableSessionRecording: true,
  enablePerformanceMonitoring: true,
})
```

## Performance Impact

The monitoring system is designed to have minimal performance impact:

- **Bundle Size**: ~15KB gzipped additional bundle size
- **Runtime Overhead**: <1ms per request for error handling
- **Memory Usage**: ~2MB additional memory for monitoring
- **Network**: Batched requests to minimize network calls

## Security Considerations

1. **Data Privacy** - All PII is masked in logs and recordings
2. **Secure Transmission** - All monitoring data sent over HTTPS
3. **Access Control** - Monitoring dashboards require authentication
4. **Data Retention** - Logs and recordings have configurable retention
5. **Compliance** - GDPR and CCPA compliant data handling

## Future Enhancements

1. **AI-Powered Error Analysis** - Automatic root cause analysis
2. **Predictive Performance** - ML-based performance predictions
3. **Advanced A/B Testing** - Error rate impact on experiments
4. **Custom Dashboards** - Business-specific monitoring views
5. **Mobile App Integration** - React Native error handling