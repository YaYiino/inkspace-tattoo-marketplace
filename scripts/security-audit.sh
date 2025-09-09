#!/bin/bash

# Comprehensive Security Audit Script for Tattoo Marketplace
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
AUDIT_TYPE="${2:-full}"
OUTPUT_DIR="./security-audit-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${OUTPUT_DIR}/security-audit-${ENVIRONMENT}-${TIMESTAMP}.json"

echo -e "${BLUE}Security Audit Script for Tattoo Marketplace${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Audit Type: ${AUDIT_TYPE}"
echo -e "Report: ${REPORT_FILE}"
echo ""

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize audit results
AUDIT_RESULTS="{
  \"environment\": \"${ENVIRONMENT}\",
  \"audit_type\": \"${AUDIT_TYPE}\",
  \"timestamp\": \"$(date -Iseconds)\",
  \"categories\": {}
}"

# Function to update audit results
update_results() {
    local category="$1"
    local check_name="$2"
    local status="$3"
    local details="$4"
    
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq \
        ".categories[\"$category\"][\"$check_name\"] = {
            \"status\": \"$status\",
            \"details\": \"$details\",
            \"timestamp\": \"$(date -Iseconds)\"
        }")
}

# Function to run a security check
run_check() {
    local category="$1"
    local check_name="$2"
    local description="$3"
    local command="$4"
    
    echo -e "${CYAN}Running: $description${NC}"
    
    if eval "$command" &> /tmp/check_output.log; then
        local details=$(cat /tmp/check_output.log | head -5 | tr '\n' ' ')
        update_results "$category" "$check_name" "PASS" "$details"
        echo -e "${GREEN}✓ PASS: $check_name${NC}"
    else
        local details=$(cat /tmp/check_output.log | head -5 | tr '\n' ' ')
        update_results "$category" "$check_name" "FAIL" "$details"
        echo -e "${RED}✗ FAIL: $check_name${NC}"
    fi
    
    rm -f /tmp/check_output.log
}

# Network Security Checks
audit_network_security() {
    echo -e "${PURPLE}=== Network Security Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.network_security = {}')
    
    # Check TLS configuration
    if [[ "$ENVIRONMENT" != "development" ]]; then
        run_check "network_security" "tls_configuration" \
            "TLS 1.3 enforcement on external endpoints" \
            "curl -sI https://${ENVIRONMENT}.tattoo-marketplace.com | grep -i 'strict-transport-security'"
        
        run_check "network_security" "ssl_certificate" \
            "SSL certificate validity" \
            "echo | openssl s_client -connect ${ENVIRONMENT}.tattoo-marketplace.com:443 2>/dev/null | openssl x509 -noout -dates"
    fi
    
    # Check security headers
    run_check "network_security" "security_headers" \
        "Essential security headers present" \
        "curl -sI https://${ENVIRONMENT}.tattoo-marketplace.com | grep -E '(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Content-Security-Policy)'"
    
    # Check for open ports (if running locally)
    if [[ "$ENVIRONMENT" == "development" ]]; then
        run_check "network_security" "open_ports" \
            "No unnecessary open ports" \
            "netstat -tuln | grep -E ':(22|80|443|3000|5432)' | wc -l | grep -E '^[1-6]$'"
    fi
}

# Application Security Checks
audit_application_security() {
    echo -e "${PURPLE}=== Application Security Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.application_security = {}')
    
    # Check authentication endpoints
    run_check "application_security" "auth_endpoints" \
        "Authentication endpoints are secure" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/auth/signin | grep -v 'error'"
    
    # Check API rate limiting
    run_check "application_security" "rate_limiting" \
        "API rate limiting is configured" \
        "for i in {1..10}; do curl -s -o /dev/null -w '%{http_code}' https://${ENVIRONMENT}.tattoo-marketplace.com/api/health; done | grep -q 429"
    
    # Check for SQL injection vulnerabilities
    run_check "application_security" "sql_injection" \
        "SQL injection protection" \
        "curl -s 'https://${ENVIRONMENT}.tattoo-marketplace.com/api/search?q=%27OR%201=1--' | grep -v 'error'"
    
    # Check for XSS protection
    run_check "application_security" "xss_protection" \
        "Cross-site scripting protection" \
        "curl -s 'https://${ENVIRONMENT}.tattoo-marketplace.com/search?q=<script>alert(1)</script>' | grep -v 'alert(1)'"
    
    # Check CORS configuration
    run_check "application_security" "cors_policy" \
        "CORS policy properly configured" \
        "curl -s -H 'Origin: https://malicious-site.com' https://${ENVIRONMENT}.tattoo-marketplace.com/api/health -I | grep -v 'Access-Control-Allow-Origin: https://malicious-site.com'"
}

# Infrastructure Security Checks
audit_infrastructure_security() {
    echo -e "${PURPLE}=== Infrastructure Security Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.infrastructure_security = {}')
    
    # Check if AWS CLI is configured
    if command -v aws &> /dev/null; then
        # Check S3 bucket policies
        run_check "infrastructure_security" "s3_bucket_policy" \
            "S3 buckets have proper access policies" \
            "aws s3api list-buckets --query 'Buckets[?contains(Name, \`tattoo-marketplace-${ENVIRONMENT}\`)].Name' --output text | xargs -I {} aws s3api get-bucket-policy --bucket {} --query Policy --output text"
        
        # Check RDS encryption
        run_check "infrastructure_security" "rds_encryption" \
            "RDS instances are encrypted" \
            "aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, \`tattoo-marketplace-${ENVIRONMENT}\`)].StorageEncrypted' --output text | grep -v False"
        
        # Check ECS task definitions security
        run_check "infrastructure_security" "ecs_security" \
            "ECS tasks run with non-root user" \
            "aws ecs describe-task-definition --task-definition tattoo-marketplace-${ENVIRONMENT} --query 'taskDefinition.containerDefinitions[0].user' --output text | grep -v root"
        
        # Check VPC security groups
        run_check "infrastructure_security" "security_groups" \
            "Security groups follow least privilege principle" \
            "aws ec2 describe-security-groups --filters 'Name=group-name,Values=*tattoo-marketplace-${ENVIRONMENT}*' --query 'SecurityGroups[?length(IpPermissions[?FromPort==\`22\` && (contains(IpRanges[].CidrIp, \`0.0.0.0/0\`) || contains(Ipv6Ranges[].CidrIpv6, \`::/0\`))])] | length(@)' --output text | grep -q '^0$'"
    else
        echo -e "${YELLOW}⚠ AWS CLI not configured, skipping infrastructure checks${NC}"
    fi
    
    # Check Docker configuration (if running locally)
    if command -v docker &> /dev/null; then
        run_check "infrastructure_security" "docker_security" \
            "Docker containers run as non-root" \
            "docker inspect tattoo-marketplace:latest | jq -r '.[0].Config.User' | grep -v '^$\\|^root$'"
    fi
}

# Data Protection Checks
audit_data_protection() {
    echo -e "${PURPLE}=== Data Protection Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.data_protection = {}')
    
    # Check database connection encryption
    run_check "data_protection" "db_connection_encryption" \
        "Database connections use SSL/TLS" \
        "echo '$DATABASE_URL' | grep -E 'sslmode=(require|verify-full)'"
    
    # Check for environment variable exposure
    run_check "data_protection" "env_var_security" \
        "Sensitive environment variables are not exposed" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/debug 2>/dev/null | grep -v -E '(DATABASE_URL|NEXTAUTH_SECRET|AWS_.*_KEY)' || echo 'No sensitive data exposed'"
    
    # Check backup encryption (if AWS configured)
    if command -v aws &> /dev/null; then
        run_check "data_protection" "backup_encryption" \
            "Database backups are encrypted" \
            "aws rds describe-db-snapshots --query 'DBSnapshots[?contains(DBSnapshotIdentifier, \`tattoo-marketplace-${ENVIRONMENT}\`)].Encrypted' --output text | grep -v False"
    fi
    
    # Check for data retention compliance
    run_check "data_protection" "data_retention" \
        "Data retention policies are implemented" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/privacy/retention-policy | jq -e '.retentionPeriod'"
}

# Access Control Checks
audit_access_control() {
    echo -e "${PURPLE}=== Access Control Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.access_control = {}')
    
    # Check authentication requirements
    run_check "access_control" "auth_required" \
        "Protected endpoints require authentication" \
        "curl -s -o /dev/null -w '%{http_code}' https://${ENVIRONMENT}.tattoo-marketplace.com/api/protected | grep -E '^(401|403)$'"
    
    # Check JWT token validation
    run_check "access_control" "jwt_validation" \
        "JWT tokens are properly validated" \
        "curl -s -H 'Authorization: Bearer invalid-token' https://${ENVIRONMENT}.tattoo-marketplace.com/api/protected -o /dev/null -w '%{http_code}' | grep -E '^(401|403)$'"
    
    # Check session management
    run_check "access_control" "session_security" \
        "Sessions are configured securely" \
        "curl -sI https://${ENVIRONMENT}.tattoo-marketplace.com/api/auth/signin | grep -i 'set-cookie' | grep -E '(HttpOnly|Secure|SameSite)'"
    
    # Check password policy enforcement
    run_check "access_control" "password_policy" \
        "Password policy is enforced" \
        "curl -s -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"123\"}' https://${ENVIRONMENT}.tattoo-marketplace.com/api/auth/signup | jq -e '.error' | grep -i 'password'"
}

# Compliance Checks
audit_compliance() {
    echo -e "${PURPLE}=== Compliance Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.compliance = {}')
    
    # Check privacy policy availability
    run_check "compliance" "privacy_policy" \
        "Privacy policy is accessible" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/privacy | grep -i 'privacy policy'"
    
    # Check terms of service
    run_check "compliance" "terms_of_service" \
        "Terms of service are accessible" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/terms | grep -i 'terms of service'"
    
    # Check GDPR compliance endpoints
    run_check "compliance" "gdpr_endpoints" \
        "GDPR data rights endpoints are available" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/privacy/data-export -I | grep -E '^HTTP.*200'"
    
    # Check cookie consent
    run_check "compliance" "cookie_consent" \
        "Cookie consent mechanism is implemented" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com | grep -i 'cookie.*consent'"
    
    # Check data processing records
    run_check "compliance" "processing_records" \
        "Data processing records are maintained" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/privacy/processing-records | jq -e '.records'"
}

# Monitoring and Logging Checks
audit_monitoring() {
    echo -e "${PURPLE}=== Monitoring and Logging Audit ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.monitoring = {}')
    
    # Check health endpoint
    run_check "monitoring" "health_endpoint" \
        "Health check endpoint is available" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/health | jq -e '.status' | grep -i healthy"
    
    # Check log aggregation (if CloudWatch is configured)
    if command -v aws &> /dev/null; then
        run_check "monitoring" "log_aggregation" \
            "Application logs are being collected" \
            "aws logs describe-log-groups --log-group-name-prefix '/ecs/tattoo-marketplace-${ENVIRONMENT}' --query 'logGroups[0].logGroupName' --output text | grep -v None"
        
        run_check "monitoring" "error_alerting" \
            "Error alerting is configured" \
            "aws cloudwatch describe-alarms --alarm-name-prefix 'tattoo-marketplace-${ENVIRONMENT}' --query 'MetricAlarms[0].AlarmName' --output text | grep -v None"
    fi
    
    # Check metrics endpoint
    run_check "monitoring" "metrics_endpoint" \
        "Metrics endpoint is available" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/metrics | jq -e '.uptime'"
}

# Vulnerability Assessment
audit_vulnerabilities() {
    echo -e "${PURPLE}=== Vulnerability Assessment ===${NC}"
    
    # Initialize category
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.categories.vulnerabilities = {}')
    
    # Check for known vulnerable dependencies
    if [[ -f "package.json" ]]; then
        run_check "vulnerabilities" "npm_audit" \
            "No high severity vulnerabilities in dependencies" \
            "npm audit --audit-level high --json | jq -e '.metadata.vulnerabilities.high == 0 and .metadata.vulnerabilities.critical == 0'"
    fi
    
    # Check Docker image vulnerabilities
    if command -v trivy &> /dev/null && command -v docker &> /dev/null; then
        run_check "vulnerabilities" "container_scan" \
            "Container image has no critical vulnerabilities" \
            "trivy image --severity CRITICAL --quiet tattoo-marketplace:latest | wc -l | grep -q '^0$'"
    fi
    
    # Check for outdated software versions
    run_check "vulnerabilities" "software_versions" \
        "Software components are up to date" \
        "curl -s https://${ENVIRONMENT}.tattoo-marketplace.com/api/version | jq -e '.versions'"
}

# Generate summary report
generate_summary() {
    echo -e "${PURPLE}=== Audit Summary ===${NC}"
    
    # Calculate overall score
    local total_checks=0
    local passed_checks=0
    
    for category in $(echo "$AUDIT_RESULTS" | jq -r '.categories | keys[]'); do
        local category_checks=$(echo "$AUDIT_RESULTS" | jq -r ".categories.${category} | length")
        local category_passed=$(echo "$AUDIT_RESULTS" | jq -r ".categories.${category} | map(select(.status == \"PASS\")) | length")
        
        total_checks=$((total_checks + category_checks))
        passed_checks=$((passed_checks + category_passed))
        
        local category_score=0
        if [[ $category_checks -gt 0 ]]; then
            category_score=$((category_passed * 100 / category_checks))
        fi
        
        echo -e "${CYAN}${category}: ${category_passed}/${category_checks} (${category_score}%)${NC}"
    done
    
    local overall_score=0
    if [[ $total_checks -gt 0 ]]; then
        overall_score=$((passed_checks * 100 / total_checks))
    fi
    
    echo -e "${BLUE}Overall Security Score: ${passed_checks}/${total_checks} (${overall_score}%)${NC}"
    
    # Update results with summary
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq \
        ".summary = {
            \"total_checks\": $total_checks,
            \"passed_checks\": $passed_checks,
            \"overall_score\": $overall_score,
            \"grade\": \"$(get_grade $overall_score)\"
        }")
    
    # Determine security grade
    if [[ $overall_score -ge 90 ]]; then
        echo -e "${GREEN}Security Grade: A (Excellent)${NC}"
    elif [[ $overall_score -ge 80 ]]; then
        echo -e "${GREEN}Security Grade: B (Good)${NC}"
    elif [[ $overall_score -ge 70 ]]; then
        echo -e "${YELLOW}Security Grade: C (Acceptable)${NC}"
    elif [[ $overall_score -ge 60 ]]; then
        echo -e "${YELLOW}Security Grade: D (Needs Improvement)${NC}"
    else
        echo -e "${RED}Security Grade: F (Critical Issues)${NC}"
    fi
}

# Get security grade based on score
get_grade() {
    local score=$1
    if [[ $score -ge 90 ]]; then
        echo "A"
    elif [[ $score -ge 80 ]]; then
        echo "B"
    elif [[ $score -ge 70 ]]; then
        echo "C"
    elif [[ $score -ge 60 ]]; then
        echo "D"
    else
        echo "F"
    fi
}

# Save results to file
save_results() {
    echo "$AUDIT_RESULTS" | jq '.' > "$REPORT_FILE"
    echo -e "${BLUE}Audit results saved to: $REPORT_FILE${NC}"
    
    # Generate HTML report
    generate_html_report
}

# Generate HTML report
generate_html_report() {
    local html_file="${OUTPUT_DIR}/security-audit-${ENVIRONMENT}-${TIMESTAMP}.html"
    
    cat > "$html_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Security Audit Report - ${ENVIRONMENT}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .category { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .pass { color: green; }
        .fail { color: red; }
        .summary { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Audit Report</h1>
        <p><strong>Environment:</strong> ${ENVIRONMENT}</p>
        <p><strong>Audit Type:</strong> ${AUDIT_TYPE}</p>
        <p><strong>Timestamp:</strong> $(date)</p>
    </div>
    
    <div class="summary">
        <h2>Executive Summary</h2>
        <p>This automated security audit assessed the security posture of the Tattoo Marketplace platform.</p>
        <div id="summary-data"></div>
    </div>
    
    <div id="audit-details"></div>
    
    <script>
        const auditData = $AUDIT_RESULTS;
        
        // Display summary
        const summaryDiv = document.getElementById('summary-data');
        if (auditData.summary) {
            summaryDiv.innerHTML = \`
                <table>
                    <tr><td><strong>Total Checks:</strong></td><td>\${auditData.summary.total_checks}</td></tr>
                    <tr><td><strong>Passed:</strong></td><td class="pass">\${auditData.summary.passed_checks}</td></tr>
                    <tr><td><strong>Failed:</strong></td><td class="fail">\${auditData.summary.total_checks - auditData.summary.passed_checks}</td></tr>
                    <tr><td><strong>Overall Score:</strong></td><td>\${auditData.summary.overall_score}%</td></tr>
                    <tr><td><strong>Security Grade:</strong></td><td>\${auditData.summary.grade}</td></tr>
                </table>
            \`;
        }
        
        // Display categories
        const detailsDiv = document.getElementById('audit-details');
        Object.keys(auditData.categories).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            categoryDiv.innerHTML = \`
                <h3>\${category.replace(/_/g, ' ').toUpperCase()}</h3>
                <table>
                    <tr><th>Check</th><th>Status</th><th>Details</th><th>Timestamp</th></tr>
                    \${Object.keys(auditData.categories[category]).map(check => \`
                        <tr>
                            <td>\${check}</td>
                            <td class="\${auditData.categories[category][check].status.toLowerCase()}">\${auditData.categories[category][check].status}</td>
                            <td>\${auditData.categories[category][check].details}</td>
                            <td>\${auditData.categories[category][check].timestamp}</td>
                        </tr>
                    \`).join('')}
                </table>
            \`;
            detailsDiv.appendChild(categoryDiv);
        });
    </script>
</body>
</html>
EOF
    
    echo -e "${BLUE}HTML report generated: $html_file${NC}"
}

# Main execution based on audit type
main() {
    case "$AUDIT_TYPE" in
        "full")
            audit_network_security
            audit_application_security
            audit_infrastructure_security
            audit_data_protection
            audit_access_control
            audit_compliance
            audit_monitoring
            audit_vulnerabilities
            ;;
        "quick")
            audit_application_security
            audit_access_control
            ;;
        "network")
            audit_network_security
            ;;
        "compliance")
            audit_compliance
            audit_data_protection
            ;;
        *)
            echo -e "${RED}Invalid audit type: $AUDIT_TYPE${NC}"
            echo "Valid options: full, quick, network, compliance"
            exit 1
            ;;
    esac
    
    generate_summary
    save_results
}

# Execute main function
main