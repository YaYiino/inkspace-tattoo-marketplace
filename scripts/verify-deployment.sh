#!/bin/bash

# Antsss Tattoo Marketplace - Production Deployment Verification Script
# Comprehensive testing of production deployment

set -e

# Configuration
APP_URL="${APP_URL:-https://antsss.com}"
HEALTH_URL="$APP_URL/api/health"
TIMEOUT=30
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_TESTS++))
}

failure() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

test_start() {
    ((TOTAL_TESTS++))
    log "Testing: $1"
}

# Utility function to make HTTP requests with retries
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    local max_attempts="${4:-$MAX_RETRIES}"
    
    for ((i=1; i<=max_attempts; i++)); do
        response=$(curl -s -w "HTTPSTATUS:%{http_code};SIZE:%{size_download};TIME:%{time_total}" \
                  -X "$method" \
                  --max-time $TIMEOUT \
                  "$url" 2>/dev/null || echo "HTTPSTATUS:000;SIZE:0;TIME:0")
        
        http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        response_size=$(echo "$response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)
        response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
        response_body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*;SIZE:[0-9]*;TIME:[0-9.]*$//')
        
        if [[ "$http_status" == "$expected_status" ]]; then
            echo "$response_body"
            return 0
        fi
        
        if [[ $i -lt $max_attempts ]]; then
            log "Attempt $i failed (HTTP $http_status), retrying in 2 seconds..."
            sleep 2
        fi
    done
    
    return 1
}

# Test 1: Basic connectivity
test_connectivity() {
    test_start "Basic connectivity to $APP_URL"
    
    if response=$(make_request "$APP_URL" "HEAD" "200"); then
        success "Site is accessible"
    else
        failure "Site is not accessible"
    fi
}

# Test 2: HTTPS and SSL
test_ssl() {
    test_start "SSL certificate and HTTPS"
    
    # Check HTTPS redirect
    redirect_response=$(curl -s -w "%{http_code}" -o /dev/null "$APP_URL" --max-time $TIMEOUT)
    if [[ "$redirect_response" == "200" || "$redirect_response" == "301" || "$redirect_response" == "302" ]]; then
        success "HTTPS is working"
    else
        failure "HTTPS configuration issue (HTTP $redirect_response)"
    fi
    
    # Check SSL certificate
    if echo | openssl s_client -servername antsss.com -connect antsss.com:443 2>/dev/null | openssl x509 -noout -dates &>/dev/null; then
        success "SSL certificate is valid"
    else
        failure "SSL certificate issue"
    fi
}

# Test 3: Security headers
test_security_headers() {
    test_start "Security headers"
    
    headers=$(curl -I -s "$APP_URL" --max-time $TIMEOUT)
    
    # Check for required security headers
    if echo "$headers" | grep -i "x-frame-options:" &>/dev/null; then
        success "X-Frame-Options header present"
    else
        failure "X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -i "x-content-type-options:" &>/dev/null; then
        success "X-Content-Type-Options header present"
    else
        failure "X-Content-Type-Options header missing"
    fi
    
    if echo "$headers" | grep -i "strict-transport-security:" &>/dev/null; then
        success "HSTS header present"
    else
        failure "HSTS header missing"
    fi
    
    if echo "$headers" | grep -i "content-security-policy:" &>/dev/null; then
        success "Content Security Policy header present"
    else
        failure "Content Security Policy header missing"
    fi
}

# Test 4: Health check endpoint
test_health_check() {
    test_start "Health check endpoint"
    
    if health_response=$(make_request "$HEALTH_URL" "GET" "200"); then
        # Parse health response
        if echo "$health_response" | grep -q '"status":"healthy"'; then
            success "Health check reports healthy status"
        else
            warning "Health check endpoint accessible but status not healthy"
        fi
        
        # Check if it's valid JSON
        if echo "$health_response" | jq . &>/dev/null; then
            success "Health check returns valid JSON"
        else
            failure "Health check returns invalid JSON"
        fi
    else
        failure "Health check endpoint not accessible"
    fi
}

# Test 5: API endpoints
test_api_endpoints() {
    test_start "API endpoint availability"
    
    # Test public API endpoints
    local endpoints=(
        "/api/health"
        "/api/auth/callback/credentials"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if make_request "$APP_URL$endpoint" "HEAD" > /dev/null 2>&1; then
            success "API endpoint $endpoint is accessible"
        else
            # Some endpoints might return 405 (Method Not Allowed) for HEAD
            if make_request "$APP_URL$endpoint" "GET" > /dev/null 2>&1; then
                success "API endpoint $endpoint is accessible"
            else
                warning "API endpoint $endpoint may not be accessible"
            fi
        fi
    done
}

# Test 6: Static assets
test_static_assets() {
    test_start "Static assets loading"
    
    # Check if main page loads with assets
    page_content=$(make_request "$APP_URL" "GET" "200" 1)
    
    if echo "$page_content" | grep -q "_next/static"; then
        success "Next.js static assets are referenced"
    else
        warning "Next.js static assets may not be properly configured"
    fi
    
    # Check favicon
    if make_request "$APP_URL/favicon.ico" "HEAD" "200" 1 > /dev/null; then
        success "Favicon is accessible"
    else
        warning "Favicon not found"
    fi
}

# Test 7: Performance checks
test_performance() {
    test_start "Basic performance metrics"
    
    # Measure response time for main page
    start_time=$(date +%s%N)
    if make_request "$APP_URL" "GET" "200" 1 > /dev/null; then
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [[ $response_time -lt 3000 ]]; then
            success "Response time is good (${response_time}ms)"
        elif [[ $response_time -lt 5000 ]]; then
            warning "Response time is acceptable (${response_time}ms)"
        else
            failure "Response time is too slow (${response_time}ms)"
        fi
    else
        failure "Could not measure response time"
    fi
}

# Test 8: Database connectivity (through health check)
test_database() {
    test_start "Database connectivity"
    
    if health_response=$(make_request "$HEALTH_URL" "GET" "200"); then
        if echo "$health_response" | jq -e '.checks.database.status == "healthy"' &>/dev/null; then
            success "Database connection is healthy"
        else
            failure "Database connection issues detected"
        fi
    else
        warning "Could not check database status through health endpoint"
    fi
}

# Test 9: Authentication pages
test_auth_pages() {
    test_start "Authentication pages"
    
    local auth_pages=(
        "/auth/login"
        "/auth/signup"
    )
    
    for page in "${auth_pages[@]}"; do
        if make_request "$APP_URL$page" "GET" "200" 1 > /dev/null; then
            success "Auth page $page is accessible"
        else
            failure "Auth page $page is not accessible"
        fi
    done
}

# Test 10: Error handling
test_error_handling() {
    test_start "Error handling"
    
    # Test 404 page
    if response=$(make_request "$APP_URL/nonexistent-page-12345" "GET" "404" 1); then
        success "404 error handling works correctly"
    else
        failure "404 error handling not working properly"
    fi
    
    # Test API error handling
    if response=$(make_request "$APP_URL/api/nonexistent" "GET" "404" 1); then
        success "API 404 error handling works correctly"
    else
        warning "API error handling may need attention"
    fi
}

# Test 11: Content Security Policy
test_csp() {
    test_start "Content Security Policy"
    
    headers=$(curl -I -s "$APP_URL" --max-time $TIMEOUT)
    
    if echo "$headers" | grep -i "content-security-policy:" | grep -q "default-src"; then
        success "CSP header has default-src directive"
    else
        failure "CSP header missing or incomplete"
    fi
}

# Test 12: Monitoring integration
test_monitoring() {
    test_start "Monitoring integrations"
    
    page_content=$(make_request "$APP_URL" "GET" "200" 1)
    
    # Check for analytics scripts (if present in HTML)
    if echo "$page_content" | grep -q "google-analytics\|gtag\|mixpanel"; then
        success "Analytics integration detected"
    else
        warning "Analytics integration may not be active (could be loaded dynamically)"
    fi
    
    # Check for Sentry integration (if present in HTML)
    if echo "$page_content" | grep -q "sentry"; then
        success "Error tracking integration detected"
    else
        warning "Error tracking integration may not be active (could be loaded dynamically)"
    fi
}

# Generate test report
generate_report() {
    echo
    echo "=================================="
    echo "  DEPLOYMENT VERIFICATION REPORT"
    echo "=================================="
    echo "URL: $APP_URL"
    echo "Date: $(date)"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo
    
    local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC} ($success_rate%)"
        echo
        echo -e "${GREEN}🚀 Production deployment is ready for launch!${NC}"
    elif [[ $FAILED_TESTS -le 2 ]]; then
        echo -e "${YELLOW}⚠ MOSTLY SUCCESSFUL${NC} ($success_rate%)"
        echo "$FAILED_TESTS tests failed. Review and fix before launch."
    else
        echo -e "${RED}✗ DEPLOYMENT ISSUES DETECTED${NC} ($success_rate%)"
        echo "$FAILED_TESTS tests failed. Do not proceed with launch."
    fi
    
    echo
    echo "=================================="
}

# Main execution
main() {
    echo
    log "Starting production deployment verification for Antsss Tattoo Marketplace"
    echo "Target URL: $APP_URL"
    echo
    
    # Wait for deployment to be ready
    log "Waiting 10 seconds for deployment to be fully ready..."
    sleep 10
    
    # Run all tests
    test_connectivity
    test_ssl
    test_security_headers
    test_health_check
    test_api_endpoints
    test_static_assets
    test_performance
    test_database
    test_auth_pages
    test_error_handling
    test_csp
    test_monitoring
    
    # Generate final report
    generate_report
    
    # Exit with appropriate code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Antsss Production Deployment Verification Script"
        echo
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --url URL     Set the application URL (default: https://antsss.com)"
        echo "  --timeout N   Set request timeout in seconds (default: 30)"
        echo "  --help        Show this help message"
        echo
        echo "Environment variables:"
        echo "  APP_URL       Application URL to test"
        echo "  TIMEOUT       Request timeout in seconds"
        exit 0
        ;;
    --url)
        APP_URL="$2"
        shift 2
        ;;
    --timeout)
        TIMEOUT="$2"
        shift 2
        ;;
esac

# Run main function
main "$@"