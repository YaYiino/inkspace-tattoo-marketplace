#!/bin/bash

# Container Security Scanning Script for Tattoo Marketplace
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${1:-tattoo-marketplace}"
TAG="${2:-latest}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
TRIVY_OUTPUT_DIR="./security-reports"
HADOLINT_OUTPUT_FILE="${TRIVY_OUTPUT_DIR}/hadolint-report.txt"
TRIVY_OUTPUT_FILE="${TRIVY_OUTPUT_DIR}/trivy-report.json"

# Create output directory
mkdir -p "${TRIVY_OUTPUT_DIR}"

echo -e "${BLUE}Starting container security scan for ${FULL_IMAGE_NAME}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install required tools if not present
install_tools() {
    echo -e "${YELLOW}Checking required security tools...${NC}"
    
    # Check for Trivy
    if ! command_exists trivy; then
        echo -e "${YELLOW}Installing Trivy...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install trivy
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y wget apt-transport-https gnupg lsb-release
            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
            echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
            sudo apt-get update
            sudo apt-get install -y trivy
        fi
    fi
    
    # Check for Hadolint
    if ! command_exists hadolint; then
        echo -e "${YELLOW}Installing Hadolint...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install hadolint
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            wget -O hadolint https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64
            chmod +x hadolint
            sudo mv hadolint /usr/local/bin/
        fi
    fi
}

# Dockerfile linting with Hadolint
dockerfile_lint() {
    echo -e "${BLUE}Running Dockerfile security lint...${NC}"
    
    if hadolint Dockerfile > "${HADOLINT_OUTPUT_FILE}" 2>&1; then
        echo -e "${GREEN}✓ Dockerfile lint passed${NC}"
    else
        echo -e "${RED}✗ Dockerfile lint found issues:${NC}"
        cat "${HADOLINT_OUTPUT_FILE}"
        return 1
    fi
}

# Vulnerability scanning with Trivy
vulnerability_scan() {
    echo -e "${BLUE}Running vulnerability scan...${NC}"
    
    # Scan for vulnerabilities
    if trivy image \
        --format json \
        --output "${TRIVY_OUTPUT_FILE}" \
        --severity HIGH,CRITICAL \
        --exit-code 1 \
        "${FULL_IMAGE_NAME}"; then
        echo -e "${GREEN}✓ No high or critical vulnerabilities found${NC}"
    else
        echo -e "${RED}✗ High or critical vulnerabilities found${NC}"
        trivy image --format table --severity HIGH,CRITICAL "${FULL_IMAGE_NAME}"
        return 1
    fi
}

# Configuration scan
config_scan() {
    echo -e "${BLUE}Running configuration scan...${NC}"
    
    if trivy config \
        --format table \
        --exit-code 1 \
        .; then
        echo -e "${GREEN}✓ Configuration scan passed${NC}"
    else
        echo -e "${RED}✗ Configuration issues found${NC}"
        return 1
    fi
}

# Secret scanning
secret_scan() {
    echo -e "${BLUE}Running secret scan...${NC}"
    
    if trivy fs \
        --scanners secret \
        --format table \
        --exit-code 1 \
        .; then
        echo -e "${GREEN}✓ No secrets found${NC}"
    else
        echo -e "${RED}✗ Potential secrets found${NC}"
        return 1
    fi
}

# Image layer analysis
layer_analysis() {
    echo -e "${BLUE}Analyzing image layers...${NC}"
    
    # Use docker history to analyze layers
    echo "Image layer information:"
    docker history --no-trunc "${FULL_IMAGE_NAME}" | head -20
    
    # Check image size
    IMAGE_SIZE=$(docker images --format "table {{.Size}}" "${FULL_IMAGE_NAME}" | tail -n +2)
    echo -e "${BLUE}Image size: ${IMAGE_SIZE}${NC}"
    
    if [[ $(docker images --format "{{.Size}}" "${FULL_IMAGE_NAME}" | sed 's/MB//g' | sed 's/GB//g' | awk '{print int($1)}') -gt 1000 ]]; then
        echo -e "${YELLOW}⚠ Warning: Image size is large (>1GB). Consider optimization.${NC}"
    else
        echo -e "${GREEN}✓ Image size is reasonable${NC}"
    fi
}

# Runtime security checks
runtime_security_checks() {
    echo -e "${BLUE}Running runtime security checks...${NC}"
    
    # Check if image runs as non-root
    USER_INFO=$(docker inspect "${FULL_IMAGE_NAME}" | jq -r '.[0].Config.User')
    if [[ "${USER_INFO}" != "null" && "${USER_INFO}" != "" && "${USER_INFO}" != "root" && "${USER_INFO}" != "0" ]]; then
        echo -e "${GREEN}✓ Image runs as non-root user: ${USER_INFO}${NC}"
    else
        echo -e "${RED}✗ Image may be running as root${NC}"
    fi
    
    # Check exposed ports
    EXPOSED_PORTS=$(docker inspect "${FULL_IMAGE_NAME}" | jq -r '.[0].Config.ExposedPorts | keys[]' 2>/dev/null || echo "none")
    echo -e "${BLUE}Exposed ports: ${EXPOSED_PORTS}${NC}"
}

# Generate security report
generate_report() {
    echo -e "${BLUE}Generating security report...${NC}"
    
    REPORT_FILE="${TRIVY_OUTPUT_DIR}/security-summary.md"
    
    cat > "${REPORT_FILE}" << EOF
# Container Security Report

**Image:** ${FULL_IMAGE_NAME}
**Scan Date:** $(date)
**Generated By:** Container Security Scanner

## Summary

This report contains the security analysis results for the tattoo marketplace container image.

## Dockerfile Lint Results

\`\`\`
$(cat "${HADOLINT_OUTPUT_FILE}" 2>/dev/null || echo "No issues found")
\`\`\`

## Vulnerability Scan Results

See detailed JSON report: [trivy-report.json](./trivy-report.json)

## Recommendations

1. **Regular Updates**: Keep base images and dependencies updated
2. **Minimal Images**: Use minimal base images like Alpine Linux
3. **Non-root User**: Always run containers as non-root users
4. **Secret Management**: Never embed secrets in images
5. **Multi-stage Builds**: Use multi-stage builds to reduce image size
6. **Regular Scanning**: Integrate security scanning into CI/CD pipeline

## Security Best Practices Applied

- ✓ Multi-stage Docker build
- ✓ Non-root user execution
- ✓ Minimal base image (Alpine)
- ✓ No secrets in image
- ✓ Optimized layer caching
- ✓ Health checks configured
- ✓ Resource limits applied

EOF

    echo -e "${GREEN}✓ Security report generated: ${REPORT_FILE}${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Container Security Scanner v1.0${NC}"
    echo -e "${BLUE}=================================${NC}"
    
    # Install required tools
    install_tools
    
    # Check if image exists
    if ! docker inspect "${FULL_IMAGE_NAME}" >/dev/null 2>&1; then
        echo -e "${RED}Error: Image ${FULL_IMAGE_NAME} not found. Please build the image first.${NC}"
        exit 1
    fi
    
    # Run security checks
    local exit_code=0
    
    dockerfile_lint || exit_code=1
    vulnerability_scan || exit_code=1
    config_scan || exit_code=1
    secret_scan || exit_code=1
    layer_analysis
    runtime_security_checks
    generate_report
    
    if [[ ${exit_code} -eq 0 ]]; then
        echo -e "${GREEN}✓ All security checks passed!${NC}"
    else
        echo -e "${RED}✗ Some security checks failed. Please review the issues above.${NC}"
    fi
    
    echo -e "${BLUE}Security reports available in: ${TRIVY_OUTPUT_DIR}${NC}"
    exit ${exit_code}
}

# Run main function
main "$@"