# Antsss Tattoo Marketplace - Deployment Guide

This guide provides comprehensive instructions for deploying the Antsss tattoo marketplace across development, staging, and production environments.

## 🏗️ Environment Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Supabase account
- Vercel account (for hosting)
- AWS account (for infrastructure)
- Docker (for local development)

### 1. Environment Configuration

Copy the example environment file and configure for your environment:

```bash
# Development
cp .env.example .env.development
cp .env.development .env.local

# Staging
cp .env.example .env.staging

# Production
cp .env.example .env.production
```

Fill in the required environment variables for each environment.

### 2. Development Environment

#### Local Development Setup

```bash
# Install dependencies
npm ci

# Start development services
npm run docker:dev

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start development server
npm run dev
```

#### Development Services

The development environment includes:
- PostgreSQL database (port 54322)
- Redis cache (port 6379)
- MailHog for email testing (port 8025)
- Elasticsearch for search (port 9200)
- MinIO for file storage (port 9000)

### 3. Testing Environment

#### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

#### Test Database Setup

```bash
# Start test services
npm run docker:test

# Set test environment
npm run env:test

# Run test migrations
npm run db:migrate
```

## 🚀 Deployment Process

### Staging Deployment

Staging deployment is automatic on pushes to the `develop` branch:

1. **Automatic Trigger**: Push to `develop` branch
2. **CI Pipeline**: Runs linting, tests, and build
3. **Deployment**: Automatic deployment to staging.antsss.com
4. **Testing**: Automated E2E tests run against staging
5. **Notification**: Team notified via Slack/email

Manual staging deployment:

```bash
# Deploy to staging manually
npm run deploy:staging
```

### Production Deployment

Production deployment requires manual approval:

1. **Trigger**: Push to `main` branch or create a release
2. **CI Pipeline**: Full test suite execution
3. **Manual Approval**: Required before production deployment
4. **Database Migrations**: Run production migrations
5. **Deployment**: Deploy to production
6. **Health Check**: Verify deployment health
7. **Rollback**: Automatic rollback if health checks fail

Manual production deployment:

```bash
# Deploy to production (requires approval)
npm run deploy:production
```

## 🏛️ Infrastructure Management

### Terraform Setup

Initialize and apply infrastructure:

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="environments/production.tfvars"

# Apply infrastructure changes
terraform apply -var-file="environments/production.tfvars"
```

### Environment-Specific Infrastructure

```bash
# Development
terraform apply -var-file="environments/dev.tfvars"

# Staging  
terraform apply -var-file="environments/staging.tfvars"

# Production
terraform apply -var-file="environments/production.tfvars"
```

## 🗃️ Database Management

### Migrations

```bash
# Run migrations
npm run db:migrate

# Rollback migrations
npm run db:migrate down 1

# Check migration status
npm run db:migrate status

# Dry run (preview changes)
npm run db:migrate dry-run
```

### Database Seeding

```bash
# Seed database with sample data
npm run db:seed

# Reset and reseed database
npm run db:seed fresh

# Reset database only
npm run db:seed reset
```

### Creating New Migrations

```bash
# Create a new migration file
npm run db:create-migration "add_user_preferences_table"
```

## 📊 Monitoring and Maintenance

### Health Checks

- **Endpoint**: `https://antsss.com/api/health`
- **Monitoring**: Automated health checks every 5 minutes
- **Alerts**: Slack/email notifications for failures

### Log Management

- **Development**: Console logs and local files
- **Staging/Production**: Sentry for errors, CloudWatch for application logs
- **Access**: `npm run logs:view` (requires AWS CLI setup)

### Performance Monitoring

- **Vercel Analytics**: Automatic performance tracking
- **Sentry Performance**: Application performance monitoring
- **Custom Metrics**: Business metrics tracking

### Backup and Recovery

Automated backups:
- **Database**: Daily automated backups
- **File Storage**: Versioned S3 storage
- **Retention**: 30 days for staging, 90 days for production

Manual backup:
```bash
npm run backup:create
npm run backup:restore <backup-id>
```

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   npm run db:status
   
   # Reset database connection
   npm run docker:dev restart
   ```

3. **Environment Variable Issues**
   ```bash
   # Verify environment variables
   npm run env:check
   ```

4. **Test Failures**
   ```bash
   # Run tests with verbose output
   npm run test -- --verbose
   
   # Update snapshots
   npm run test -- --updateSnapshot
   ```

### Emergency Procedures

#### Production Rollback

```bash
# Immediate rollback to previous version
npm run rollback:production

# Or via Vercel CLI
vercel rollback --prod
```

#### Database Recovery

```bash
# Restore from latest backup
npm run db:restore latest

# Restore from specific backup
npm run db:restore <backup-timestamp>
```

## 🚨 Emergency Contacts

- **Platform Team**: platform@antsss.com
- **On-Call Engineer**: +1 (555) 123-4567
- **Slack Channel**: #antsss-alerts

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Performance benchmarks met

### Post-Deployment
- [ ] Health checks passing
- [ ] Database migrations successful
- [ ] Performance metrics normal
- [ ] Error rates within acceptable limits
- [ ] User acceptance testing completed

### Rollback Criteria
- [ ] Error rate > 5%
- [ ] Response time > 3 seconds
- [ ] Database connectivity issues
- [ ] Critical functionality broken
- [ ] Security vulnerabilities detected

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Security Guidelines](./SECURITY.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [AWS Console](https://console.aws.amazon.com)

## 🤝 Support

For deployment issues or questions:
1. Check this guide first
2. Search existing issues on GitHub
3. Contact the platform team
4. Create a new issue with deployment logs

---

Last updated: September 2024
Version: 1.0.0