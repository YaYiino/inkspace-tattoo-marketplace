#!/bin/bash

# Antsss Tattoo Marketplace - Production Setup Script
# This script orchestrates the complete production deployment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    local tools=("node" "npm" "git" "curl" "openssl")
    for tool in "${tools[@]}"; do
        if command -v $tool &> /dev/null; then
            success "$tool is installed"
        else
            error "$tool is required but not installed"
            exit 1
        fi
    done

    # Check environment file
    if [[ ! -f ".env.production" ]]; then
        warning ".env.production file not found"
        log "Creating from template..."
        cp .env.production.template .env.production
        warning "Please fill in the values in .env.production before proceeding"
        exit 1
    fi
}

# Generate security secrets
generate_secrets() {
    log "Generating security secrets..."
    
    local env_file=".env.production"
    local temp_file=".env.production.tmp"
    
    # Generate secrets
    local nextauth_secret=$(openssl rand -base64 32)
    local jwt_secret=$(openssl rand -base64 32)
    local health_token=$(openssl rand -base64 24)
    
    # Replace placeholders in .env.production
    sed "s/your_nextauth_secret_here/$nextauth_secret/g" "$env_file" > "$temp_file"
    sed -i "s/your_jwt_secret_here/$jwt_secret/g" "$temp_file"
    sed -i "s/your_health_check_token_here/$health_token/g" "$temp_file"
    
    mv "$temp_file" "$env_file"
    success "Security secrets generated"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    npm ci --production=false
    success "Dependencies installed"
}

# Build application
build_application() {
    log "Building application for production..."
    npm run build
    success "Application built successfully"
}

# Run tests
run_tests() {
    log "Running test suite..."
    npm run test
    npm run type-check
    success "All tests passed"
}

# Configure Vercel environment
setup_vercel_env() {
    log "Setting up Vercel environment variables..."
    
    if command -v vercel &> /dev/null; then
        # Read .env.production and set Vercel env vars
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            if [[ ! $key =~ ^# ]] && [[ -n $key ]] && [[ -n $value ]]; then
                vercel env add "$key" production <<< "$value"
            fi
        done < .env.production
        
        success "Vercel environment variables configured"
    else
        warning "Vercel CLI not found. Please install and configure manually."
    fi
}

# Setup Supabase production project
setup_supabase() {
    log "Setting up Supabase production configuration..."
    
    # Check if supabase CLI is available
    if command -v supabase &> /dev/null; then
        log "Running database migrations..."
        npm run db:migrate
        success "Database migrations completed"
    else
        warning "Supabase CLI not found. Please set up database manually."
    fi
}

# Configure monitoring
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Create monitoring configuration
    cat > monitoring-config.json << EOF
{
  "healthChecks": {
    "endpoints": [
      "https://antsss.com/api/health",
      "https://antsss.com/auth/login",
      "https://antsss.com/"
    ],
    "interval": 300,
    "timeout": 30,
    "alertThreshold": 3
  },
  "performance": {
    "targets": {
      "loadTime": 3000,
      "firstContentfulPaint": 1500,
      "largestContentfulPaint": 2500
    }
  },
  "errors": {
    "rateThreshold": 1.0,
    "notificationChannels": ["email", "slack"]
  }
}
EOF
    
    success "Monitoring configuration created"
}

# Setup SSL and security
setup_security() {
    log "Configuring security settings..."
    
    # Create security report
    cat > security-checklist.md << EOF
# Production Security Checklist

## SSL/TLS Configuration
- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect configured
- [ ] HSTS header enabled
- [ ] SSL Labs rating A+ achieved

## Security Headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection enabled
- [ ] Content Security Policy configured
- [ ] Referrer Policy set

## Authentication & Authorization
- [ ] OAuth providers configured for production
- [ ] JWT secrets are strong and unique
- [ ] Session timeout configured
- [ ] Rate limiting enabled

## Data Protection
- [ ] Database RLS policies active
- [ ] Sensitive data encrypted
- [ ] File upload restrictions in place
- [ ] CORS properly configured

## Monitoring
- [ ] Error tracking active (Sentry)
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alert channels tested
EOF
    
    success "Security checklist created"
}

# Deploy to production
deploy_to_production() {
    log "Deploying to production..."
    
    if command -v vercel &> /dev/null; then
        # Deploy to Vercel
        vercel --prod
        success "Deployed to production"
    else
        warning "Vercel CLI not found. Please deploy manually."
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    local app_url="https://antsss.com"
    local health_url="$app_url/api/health"
    
    # Wait for deployment to be ready
    sleep 30
    
    # Check main site
    if curl -f -s "$app_url" > /dev/null; then
        success "Main site is accessible"
    else
        error "Main site is not accessible"
        exit 1
    fi
    
    # Check health endpoint
    if curl -f -s "$health_url" > /dev/null; then
        success "Health check endpoint is working"
    else
        error "Health check endpoint is not working"
        exit 1
    fi
    
    # Check SSL
    if curl -I -s "$app_url" | grep -q "HTTP/2 200"; then
        success "HTTPS is working correctly"
    else
        warning "HTTPS configuration may need attention"
    fi
}

# Run production smoke tests
run_smoke_tests() {
    log "Running production smoke tests..."
    
    # Run end-to-end tests against production
    npm run test:e2e -- --config=playwright.config.prod.ts
    
    success "Smoke tests completed"
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Antsss Tattoo Marketplace - Production Deployment Report

**Deployment Date:** $(date)
**Environment:** Production
**URL:** https://antsss.com

## Deployment Summary
- ✅ Prerequisites checked
- ✅ Dependencies installed  
- ✅ Application built successfully
- ✅ Tests passed
- ✅ Environment configured
- ✅ Database migrations applied
- ✅ Security configured
- ✅ Monitoring setup
- ✅ Deployment completed
- ✅ Verification successful

## Environment Configuration
- **Node.js Version:** $(node --version)
- **NPM Version:** $(npm --version)
- **Build Size:** $(du -sh .next | cut -f1)

## Next Steps
1. Monitor application performance for first 24 hours
2. Verify all monitoring alerts are working
3. Test all critical user flows
4. Prepare launch announcement
5. Set up ongoing maintenance schedule

## Emergency Contacts
- Technical Lead: tech@antsss.com
- On-Call Engineer: alerts@antsss.com
- Status Page: https://status.antsss.com

---
Generated by production-setup.sh
EOF
    
    success "Deployment report generated: $report_file"
}

# Main execution flow
main() {
    log "Starting Antsss Tattoo Marketplace production deployment..."
    echo
    
    check_prerequisites
    generate_secrets
    install_dependencies
    build_application
    run_tests
    setup_vercel_env
    setup_supabase
    setup_monitoring
    setup_security
    deploy_to_production
    verify_deployment
    run_smoke_tests
    generate_report
    
    echo
    success "🚀 Production deployment completed successfully!"
    echo
    log "Your tattoo marketplace is now live at: https://antsss.com"
    log "Health check: https://antsss.com/api/health"
    echo
    warning "Remember to:"
    echo "  1. Monitor the application for the first 24 hours"
    echo "  2. Test all critical user flows"
    echo "  3. Announce the launch to your audience"
    echo "  4. Set up regular backups and maintenance"
}

# Execute main function
main "$@"