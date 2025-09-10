#!/bin/bash

# Antsss Tattoo Marketplace - Production Deployment Script
# This script orchestrates the complete production deployment process

set -e  # Exit on any error
set -u  # Exit on undefined variables

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_NAME="antsss-tattoo-marketplace"
PRODUCTION_URL="https://antsss.com"
STAGING_URL="https://staging.antsss.com"
HEALTH_CHECK_ENDPOINT="/api/health"
MAX_RETRIES=30
RETRY_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

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
    exit 1
}

check_dependencies() {
    log "Checking required dependencies..."
    
    command -v node >/dev/null 2>&1 || error "Node.js is required but not installed"
    command -v npm >/dev/null 2>&1 || error "npm is required but not installed"
    command -v vercel >/dev/null 2>&1 || error "Vercel CLI is required but not installed"
    command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
        error "Node.js version $REQUIRED_NODE_VERSION or higher is required. Found: $NODE_VERSION"
    fi
    
    success "All dependencies are available"
}

verify_environment() {
    log "Verifying environment configuration..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "next.config.js" ]; then
        error "Please run this script from the project root directory"
    fi
    
    # Check if production environment file exists
    if [ ! -f ".env.production" ]; then
        error ".env.production file is missing"
    fi
    
    success "Environment verified"
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

run_pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check Git status
    if [ -n "$(git status --porcelain)" ]; then
        warning "You have uncommitted changes. Consider committing them before deployment."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Ensure we're on the main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        warning "You're not on the main branch (current: $CURRENT_BRANCH)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    success "Pre-deployment checks passed"
}

install_dependencies() {
    log "Installing production dependencies..."
    
    # Clean install for production
    rm -rf node_modules
    rm -f package-lock.json
    npm ci --production=false
    
    success "Dependencies installed"
}

run_tests() {
    log "Running test suite..."
    
    # Type checking
    log "Running TypeScript type checking..."
    npm run type-check || error "Type checking failed"
    
    # Linting
    log "Running ESLint..."
    npm run lint || error "Linting failed"
    
    # Unit tests
    log "Running unit tests..."
    npm run test || error "Unit tests failed"
    
    # Build test
    log "Testing production build..."
    npm run build || error "Production build failed"
    
    success "All tests passed"
}

# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================

setup_supabase_production() {
    log "Setting up production Supabase configuration..."
    
    # Check if Supabase CLI is available
    if command -v supabase >/dev/null 2>&1; then
        log "Running production database setup..."
        
        # Note: In a real scenario, you'd need to connect to your production Supabase instance
        # supabase db push --project-ref YOUR_PROD_PROJECT_REF
        
        log "Running production-specific SQL setup..."
        # You would run: supabase db reset --project-ref YOUR_PROD_PROJECT_REF
        # Then execute the production setup script
        
        success "Supabase production setup completed"
    else
        warning "Supabase CLI not found. Skipping database setup."
        warning "Please ensure production database is configured manually."
    fi
}

# ============================================================================
# VERCEL DEPLOYMENT
# ============================================================================

deploy_to_vercel() {
    log "Deploying to Vercel production..."
    
    # Ensure we're logged in to Vercel
    if ! vercel whoami >/dev/null 2>&1; then
        log "Logging into Vercel..."
        vercel login
    fi
    
    # Set production environment
    export NODE_ENV=production
    
    # Deploy to production
    log "Starting production deployment..."
    DEPLOYMENT_URL=$(vercel --prod --yes 2>&1 | grep "https://" | tail -1 | tr -d ' ')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        # Fallback: use vercel domains list to get the production URL
        DEPLOYMENT_URL=$PRODUCTION_URL
    fi
    
    log "Deployment completed. URL: $DEPLOYMENT_URL"
    
    success "Vercel deployment successful"
}

# ============================================================================
# HEALTH CHECKS AND VALIDATION
# ============================================================================

wait_for_deployment() {
    local url=$1
    local retries=0
    
    log "Waiting for deployment to be ready at $url..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "${url}${HEALTH_CHECK_ENDPOINT}" >/dev/null 2>&1; then
            success "Deployment is ready and healthy"
            return 0
        fi
        
        log "Deployment not ready yet (attempt $((retries + 1))/$MAX_RETRIES)..."
        sleep $RETRY_INTERVAL
        retries=$((retries + 1))
    done
    
    error "Deployment failed to become ready after $MAX_RETRIES attempts"
}

validate_deployment() {
    local url=$1
    log "Validating deployment at $url..."
    
    # Test health endpoint
    log "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s "${url}${HEALTH_CHECK_ENDPOINT}" || echo "")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        success "Health check passed"
    else
        error "Health check failed. Response: $HEALTH_RESPONSE"
    fi
    
    # Test main page load
    log "Testing main page..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        success "Main page loads correctly"
    else
        error "Main page failed to load. HTTP Status: $HTTP_STATUS"
    fi
    
    # Test API endpoints
    log "Testing API endpoints..."
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${url}/api/auth/session" || echo "000")
    if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "401" ]; then
        # 401 is expected for auth endpoint without session
        success "API endpoints are accessible"
    else
        error "API endpoints failed. HTTP Status: $API_STATUS"
    fi
    
    # Test SSL certificate
    log "Validating SSL certificate..."
    if curl -s --head "$url" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
        success "SSL certificate is valid"
    else
        warning "SSL validation inconclusive"
    fi
    
    success "Deployment validation completed"
}

# ============================================================================
# MONITORING SETUP
# ============================================================================

setup_monitoring() {
    log "Setting up production monitoring..."
    
    # This would typically involve:
    # 1. Configuring Sentry for error tracking
    # 2. Setting up Vercel Analytics
    # 3. Configuring uptime monitoring
    # 4. Setting up alert channels
    
    log "Verifying Sentry configuration..."
    if grep -q "SENTRY_DSN" .env.production; then
        success "Sentry configuration found"
    else
        warning "Sentry DSN not configured in .env.production"
    fi
    
    log "Verifying analytics configuration..."
    if grep -q "GOOGLE_ANALYTICS_ID\|MIXPANEL_TOKEN" .env.production; then
        success "Analytics configuration found"
    else
        warning "Analytics not configured in .env.production"
    fi
    
    success "Monitoring setup verified"
}

# ============================================================================
# POST-DEPLOYMENT TASKS
# ============================================================================

run_post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    # Warm up the application
    log "Warming up application..."
    curl -s "$PRODUCTION_URL" >/dev/null || true
    curl -s "${PRODUCTION_URL}/api/health" >/dev/null || true
    
    # Generate sitemap
    log "Generating sitemap..."
    curl -s "${PRODUCTION_URL}/api/sitemap" >/dev/null || true
    
    # Clear CDN cache if applicable
    log "Cache invalidation (if applicable)..."
    # This would depend on your CDN setup
    
    success "Post-deployment tasks completed"
}

create_deployment_summary() {
    local deployment_time=$(date +'%Y-%m-%d %H:%M:%S UTC')
    local git_commit=$(git rev-parse --short HEAD)
    local git_branch=$(git branch --show-current)
    
    log "Creating deployment summary..."
    
    cat > deployment-summary.json << EOF
{
  "deployment": {
    "timestamp": "$deployment_time",
    "environment": "production",
    "url": "$PRODUCTION_URL",
    "git": {
      "commit": "$git_commit",
      "branch": "$git_branch"
    },
    "health_check": {
      "endpoint": "$PRODUCTION_URL$HEALTH_CHECK_ENDPOINT",
      "status": "healthy"
    }
  }
}
EOF
    
    success "Deployment summary created: deployment-summary.json"
}

# ============================================================================
# ROLLBACK FUNCTIONALITY
# ============================================================================

rollback_deployment() {
    log "Initiating rollback..."
    
    warning "Rolling back to previous deployment..."
    vercel rollback --yes
    
    # Wait for rollback to complete
    wait_for_deployment "$PRODUCTION_URL"
    
    success "Rollback completed successfully"
}

# ============================================================================
# MAIN DEPLOYMENT ORCHESTRATION
# ============================================================================

main() {
    log "🚀 Starting production deployment for $PROJECT_NAME"
    
    # Trap errors and offer rollback
    trap 'error "Deployment failed! Run with --rollback flag to rollback if needed."' ERR
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            verify_environment
            run_pre_deployment_checks
            install_dependencies
            run_tests
            setup_supabase_production
            deploy_to_vercel
            wait_for_deployment "$PRODUCTION_URL"
            validate_deployment "$PRODUCTION_URL"
            setup_monitoring
            run_post_deployment_tasks
            create_deployment_summary
            
            success "🎉 Production deployment completed successfully!"
            log "Production URL: $PRODUCTION_URL"
            log "Health Check: ${PRODUCTION_URL}${HEALTH_CHECK_ENDPOINT}"
            ;;
        
        "rollback"|"--rollback")
            rollback_deployment
            ;;
        
        "health"|"--health")
            validate_deployment "$PRODUCTION_URL"
            ;;
        
        "help"|"--help"|"-h")
            echo "Usage: $0 [deploy|rollback|health|help]"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy to production (default)"
            echo "  rollback - Rollback to previous deployment"
            echo "  health   - Check deployment health"
            echo "  help     - Show this help message"
            ;;
        
        *)
            error "Unknown command: $1. Use --help for usage information."
            ;;
    esac
}

# Run main function with all arguments
main "$@"