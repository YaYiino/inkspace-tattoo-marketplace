# Development Workflow Setup - Antsss Platform

This document provides a comprehensive overview of the development workflow and staging environment setup for the Antsss tattoo marketplace platform. The setup supports rapid development cycles while maintaining high quality standards and production stability.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Git Branching Strategy](#git-branching-strategy)
3. [Environment Configuration](#environment-configuration)
4. [Development Workflow](#development-workflow)
5. [Code Quality Infrastructure](#code-quality-infrastructure)
6. [Automated Deployment Pipelines](#automated-deployment-pipelines)
7. [Local Development Environment](#local-development-environment)
8. [Database Management](#database-management)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring and Observability](#monitoring-and-observability)
11. [Getting Started](#getting-started)

## 📖 Overview

The Antsss platform development workflow is designed to support:

- **Rapid Development**: 6-week sprint cycles with continuous integration
- **Quality Assurance**: Automated testing, code quality checks, and security scanning
- **Deployment Safety**: Staging environments, health checks, and automated rollbacks
- **Developer Experience**: Comprehensive tooling, documentation, and local development support
- **Production Reliability**: Monitoring, alerting, and incident response capabilities

## 🌿 Git Branching Strategy

Our branching strategy follows a modified Git Flow optimized for continuous delivery:

### Branch Types

- **`main`**: Production-ready code with automatic deployment
- **`develop`**: Integration branch for ongoing development
- **`staging`**: Pre-production testing environment
- **`feature/*`**: New feature development branches
- **`bugfix/*`**: Non-critical bug fixes
- **`hotfix/*`**: Critical production fixes
- **`release/*`**: Release preparation branches

### Branch Protection Rules

| Branch | Required Reviews | Status Checks | Auto-merge |
|--------|------------------|---------------|------------|
| `main` | 2 code owners | All CI + E2E + Security | ❌ Manual |
| `develop` | 1 reviewer | Core CI checks | ✅ Auto |
| `staging` | 1 maintainer | CI + Health checks | ❌ Manual |
| `feature/*` | 0 (self-merge) | Basic CI | ✅ Auto |

### Key Files

- `.github/branch-protection.yml` - Branch protection configuration
- `.github/CODEOWNERS` - Code ownership and review assignments
- `BRANCHING_STRATEGY.md` - Detailed branching workflow documentation

## 🌍 Environment Configuration

### Environment Types

1. **Development** (`development`)
   - Local development with debug tools enabled
   - Comprehensive logging and developer aids
   - Mock data and testing utilities

2. **Staging** (`staging`)
   - Production-like environment for testing
   - Real integrations with sandbox/test APIs
   - Performance monitoring enabled

3. **Production** (`production`)
   - Live environment with optimized settings
   - Error reporting and monitoring
   - Security hardening enabled

### Environment Files

- `.env.development` - Development configuration template
- `.env.staging` - Staging environment settings
- `.env.production` - Production environment settings
- `lib/env.ts` - Type-safe environment management

### Feature Flags

Environment-specific feature flags allow gradual rollouts:

```typescript
// Development
NEXT_PUBLIC_FEATURE_BOOKING_V2=true
NEXT_PUBLIC_FEATURE_AI_RECOMMENDATIONS=false

// Staging  
NEXT_PUBLIC_FEATURE_BOOKING_V2=true
NEXT_PUBLIC_FEATURE_AI_RECOMMENDATIONS=true

// Production
NEXT_PUBLIC_FEATURE_BOOKING_V2=true
NEXT_PUBLIC_FEATURE_AI_RECOMMENDATIONS=false
```

## ⚙️ Development Workflow

### Pre-commit Hooks

Automated quality checks run before each commit:

- **ESLint** with auto-fix for code style
- **Prettier** for consistent formatting
- **TypeScript** type checking
- **Security scanning** for potential secrets
- **Test execution** on changed files
- **Bundle size analysis** for performance

### Commit Message Convention

We use [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

feat(auth): add OAuth2 integration for Google login
fix(booking): resolve duplicate booking creation issue
docs(api): update authentication endpoint documentation
```

### Pull Request Process

1. **Create Feature Branch**: `feature/ANT-123-user-authentication`
2. **Develop with Tests**: Write code and comprehensive tests
3. **Push for Preview**: Automatic preview deployment created
4. **Code Review**: Assigned reviewers based on CODEOWNERS
5. **Quality Gates**: All CI checks must pass
6. **Merge to Develop**: Automated deployment to staging
7. **QA Testing**: Manual and automated testing on staging
8. **Release**: Promotion to production

## 🔍 Code Quality Infrastructure

### Linting and Formatting

- **ESLint** with comprehensive rule set including:
  - TypeScript-specific rules
  - React/Next.js best practices
  - Accessibility requirements
  - Security patterns
  - Import organization

- **Prettier** with project-specific configuration:
  - 100-character line width
  - Single quotes for consistency
  - Trailing commas for cleaner diffs
  - File-type specific overrides

### Code Quality Metrics

- **Test Coverage**: Minimum 80% coverage required
- **Cyclomatic Complexity**: Maximum 10 per function
- **File Size Limits**: 300KB maximum per file
- **Bundle Analysis**: Automatic bundle size tracking

### Quality Check Script

Run comprehensive quality analysis:

```bash
# All quality checks
./scripts/quality-check.sh

# Specific checks
./scripts/quality-check.sh formatting
./scripts/quality-check.sh security
./scripts/quality-check.sh coverage
```

## 🚀 Automated Deployment Pipelines

### Preview Deployments

Every feature branch gets an automatic preview deployment:

- **URL Pattern**: `https://preview-[branch-name].vercel.app`
- **Environment**: Isolated with test data
- **Lifecycle**: Created on push, cleaned up on PR close
- **Testing**: Automated E2E tests run against preview

### Staging Deployment

- **Trigger**: Merges to `develop` branch
- **URL**: `https://staging.antsss.com`
- **Features**: Latest features enabled for testing
- **Data**: Production-like but synthetic data

### Production Deployment

- **Trigger**: Merges to `main` branch
- **URL**: `https://antsss.com`
- **Process**: 
  1. Pre-deployment validation
  2. Database migrations (if needed)
  3. Blue-green deployment
  4. Health checks
  5. Automatic rollback on failure

### Health Checks

Comprehensive health monitoring:
- HTTP endpoint availability
- API functionality tests
- Database connectivity
- Authentication system status
- Critical user journey validation

## 💻 Local Development Environment

### Quick Setup

```bash
# Clone repository
git clone [repository-url]
cd tattoo-marketplace

# Run comprehensive setup
./scripts/dev-setup.sh

# Start development server
npm run dev
```

### Development Tools

- **Next.js Dev Server** with hot reload
- **TypeScript** compilation and type checking
- **React Query Devtools** for API debugging  
- **Storybook** for component development
- **Docker Compose** for local services

### VS Code Integration

Pre-configured workspace with:
- Recommended extensions
- Debugging configurations
- Task definitions
- Code formatting settings

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:debug        # Start with debugger attached
./scripts/dev.sh         # Comprehensive dev startup

# Testing
npm run test             # Unit tests
npm run test:watch       # Tests in watch mode
npm run test:e2e         # End-to-end tests
npm run test:coverage    # Coverage report

# Quality
npm run lint             # ESLint checking
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # TypeScript validation
./scripts/quality-check.sh # Complete quality analysis

# Database
npm run db:seed          # Seed database with test data
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database to clean state
```

## 🗄️ Database Management

### Seeding Strategy

Environment-specific seeding:

- **Development**: 20 clients, 8 artists, 50 bookings
- **Staging**: 50 clients, 15 artists, 150 bookings  
- **Production**: Admin user only

### Seeding Script

```bash
# Seed database for current environment
npm run db:seed

# Clear and reseed (development only)
npx tsx scripts/seed.ts clear
npx tsx scripts/seed.ts seed
```

### Test Accounts

- **Admin**: admin@antsss.com / admin123
- **All Others**: password123

## 🧪 Testing Strategy

### Test Types

1. **Unit Tests** (Jest + React Testing Library)
   - Component logic testing
   - Utility function validation
   - Hook behavior verification

2. **Integration Tests** (Jest)
   - API endpoint testing
   - Database interaction validation
   - Service integration checks

3. **End-to-End Tests** (Playwright)
   - Complete user journey testing
   - Cross-browser compatibility
   - Performance validation

4. **Visual Regression Tests** (Storybook + Chromatic)
   - UI component consistency
   - Cross-browser rendering
   - Responsive design validation

### Test Execution

- **Pre-commit**: Quick tests on changed files
- **CI Pipeline**: Full test suite on all changes
- **Preview Deployment**: E2E tests against live preview
- **Production**: Smoke tests after deployment

## 📊 Monitoring and Observability

### Application Performance Monitoring

- **Sentry** for error tracking and performance monitoring
- **Vercel Analytics** for web vitals and user insights
- **Custom metrics** for business KPIs

### Logging Strategy

- **Development**: Verbose console logging with pretty formatting
- **Staging**: Structured JSON logs with info level
- **Production**: Error/warn level with structured logging

### Health Monitoring

- `/api/health` - Basic application health
- `/api/health/database` - Database connectivity
- `/api/health/services` - External service status

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop
- Git
- VS Code (recommended)

### Initial Setup

1. **Clone and Setup**:
   ```bash
   git clone [repository-url]
   cd tattoo-marketplace
   chmod +x scripts/dev-setup.sh
   ./scripts/dev-setup.sh
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.development .env.local
   # Update Supabase credentials in .env.local
   ```

3. **Database Setup**:
   ```bash
   npm run db:migrate  # Run migrations
   npm run db:seed     # Seed with test data
   ```

4. **Start Development**:
   ```bash
   npm run dev
   # or
   ./scripts/dev.sh
   ```

### First Contribution

1. **Create Feature Branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/ANT-123-my-feature
   ```

2. **Develop with Quality**:
   - Write tests for new functionality
   - Follow TypeScript best practices
   - Use conventional commit messages
   - Test locally before pushing

3. **Submit for Review**:
   ```bash
   git push origin feature/ANT-123-my-feature
   # Create pull request through GitHub UI
   ```

4. **Monitor Pipeline**:
   - Check CI/CD pipeline status
   - Review preview deployment
   - Address any review feedback

## 📚 Additional Resources

### Documentation

- [SETUP.md](./SETUP.md) - Basic project setup
- [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md) - Detailed Git workflow
- [API Documentation](./docs/api/) - API reference and examples
- [Component Library](./docs/components/) - UI component documentation

### External Services

- [Vercel Dashboard](https://vercel.com/dashboard) - Deployment monitoring
- [Supabase Console](https://app.supabase.com) - Database management
- [Sentry Dashboard](https://sentry.io) - Error monitoring

### Development Tools

- [VS Code Extensions](./docs/vscode-setup.md) - Recommended extensions
- [Docker Setup](./docs/docker-setup.md) - Container configuration
- [Testing Guide](./docs/testing.md) - Testing best practices

## 🆘 Troubleshooting

### Common Issues

**Environment Setup Issues**:
```bash
# Reset environment
rm -rf node_modules .next
npm ci
npm run build
```

**Database Connection Issues**:
```bash
# Check database status
docker-compose -f docker-compose.dev.yml ps
# Restart database
docker-compose -f docker-compose.dev.yml restart postgres
```

**Build Issues**:
```bash
# Clean build cache
rm -rf .next
npm run build
```

**Type Issues**:
```bash
# Regenerate database types
npm run db:generate
# Check types
npm run type-check
```

### Getting Help

1. **Check Documentation**: Review relevant docs in `/docs` folder
2. **Search Issues**: Look for similar issues in GitHub
3. **Ask Team**: Reach out in development Slack channel
4. **Create Issue**: Document problem with reproduction steps

---

This comprehensive development workflow ensures high-quality code delivery while maintaining developer productivity and system reliability. The setup supports the aggressive 6-day sprint cycles while providing safety nets for production stability.

For questions or improvements to this workflow, please create an issue or reach out to the development team.