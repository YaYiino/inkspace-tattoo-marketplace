#!/bin/bash

# Deployment Orchestration Script for Tattoo Marketplace
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
DEPLOYMENT_TYPE="${2:-rolling}"
DRY_RUN="${3:-false}"
SKIP_TESTS="${4:-false}"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Validation
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be development, staging, or production.${NC}"
    exit 1
fi

if [[ ! "$DEPLOYMENT_TYPE" =~ ^(rolling|blue-green|canary)$ ]]; then
    echo -e "${RED}Error: Invalid deployment type '$DEPLOYMENT_TYPE'. Must be rolling, blue-green, or canary.${NC}"
    exit 1
fi

echo -e "${BLUE}Tattoo Marketplace Deployment Script${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Deployment Type: ${DEPLOYMENT_TYPE}"
echo -e "Dry Run: ${DRY_RUN}"
echo -e "Skip Tests: ${SKIP_TESTS}"
echo -e "AWS Region: ${AWS_REGION}"
echo ""

# Function to run command with dry-run support
run_command() {
    local description="$1"
    local command="$2"
    
    echo -e "${CYAN}${description}${NC}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}DRY RUN: Would execute: $command${NC}"
        return 0
    else
        echo -e "${BLUE}Executing: $command${NC}"
        eval "$command"
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    echo -e "${PURPLE}=== Pre-deployment Checks ===${NC}"
    
    # Check required tools
    local required_tools=("docker" "aws" "terraform" "npm" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            echo -e "${RED}Error: Required tool '$tool' not found${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✓ All required tools available${NC}"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}Error: AWS credentials not configured${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ AWS credentials configured${NC}"
    
    # Check environment variables
    local required_vars=("DATABASE_URL" "NEXTAUTH_SECRET")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            echo -e "${RED}Error: Required environment variable '$var' not set${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✓ Required environment variables set${NC}"
    
    # Check Git status
    if [[ -n "$(git status --porcelain)" ]]; then
        echo -e "${YELLOW}Warning: Working directory has uncommitted changes${NC}"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            echo -e "${RED}Error: Cannot deploy to production with uncommitted changes${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ Git status clean (or acceptable for non-production)${NC}"
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" ]]; then
        echo -e "${RED}Error: Production deployments must be from main branch${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Deploying from appropriate branch: $CURRENT_BRANCH${NC}"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        echo -e "${YELLOW}Skipping tests as requested${NC}"
        return
    fi
    
    echo -e "${PURPLE}=== Running Tests ===${NC}"
    
    run_command "Installing dependencies" "npm ci"
    run_command "Running linter" "npm run lint"
    run_command "Running type check" "npx tsc --noEmit"
    run_command "Running unit tests" "npm test"
    
    if [[ "$ENVIRONMENT" != "production" ]]; then
        run_command "Running integration tests" "npm run test:integration"
    fi
    
    echo -e "${GREEN}✓ All tests passed${NC}"
}

# Security scanning
security_scan() {
    echo -e "${PURPLE}=== Security Scanning ===${NC}"
    
    run_command "Running security audit" "npm audit --audit-level high"
    run_command "Running container security scan" "./scripts/container-security-scan.sh tattoo-marketplace latest"
    run_command "Running full security audit" "./scripts/security-audit.sh $ENVIRONMENT quick"
    
    echo -e "${GREEN}✓ Security scans completed${NC}"
}

# Build and push container
build_and_push() {
    echo -e "${PURPLE}=== Building and Pushing Container ===${NC}"
    
    local image_tag="$(git rev-parse --short HEAD)"
    local full_image_name="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/tattoo-marketplace:${image_tag}"
    
    # Login to ECR
    run_command "Logging into ECR" "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Build image
    run_command "Building Docker image" "docker build -t tattoo-marketplace:${image_tag} -t tattoo-marketplace:latest ."
    
    # Tag for ECR
    run_command "Tagging image for ECR" "docker tag tattoo-marketplace:${image_tag} ${full_image_name}"
    
    # Push to ECR
    run_command "Pushing image to ECR" "docker push ${full_image_name}"
    
    # Export image name for later use
    export DEPLOYMENT_IMAGE="${full_image_name}"
    
    echo -e "${GREEN}✓ Container built and pushed: ${full_image_name}${NC}"
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${PURPLE}=== Deploying Infrastructure ===${NC}"
    
    cd infrastructure/terraform
    
    run_command "Initializing Terraform" "terraform init"
    run_command "Validating Terraform configuration" "terraform validate"
    run_command "Planning infrastructure changes" "terraform plan -var-file=\"environments/${ENVIRONMENT}.tfvars\" -var=\"app_image=${DEPLOYMENT_IMAGE}\" -out=tfplan"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        echo -e "${YELLOW}Applying infrastructure changes...${NC}"
        terraform apply tfplan
        
        # Get outputs
        export CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
        export SERVICE_NAME=$(terraform output -raw ecs_service_name)
        export LOAD_BALANCER_DNS=$(terraform output -raw load_balancer_dns_name)
    fi
    
    cd ../..
    
    echo -e "${GREEN}✓ Infrastructure deployment completed${NC}"
}

# Deploy application
deploy_application() {
    echo -e "${PURPLE}=== Deploying Application ===${NC}"
    
    case "$DEPLOYMENT_TYPE" in
        "rolling")
            deploy_rolling
            ;;
        "blue-green")
            deploy_blue_green
            ;;
        "canary")
            deploy_canary
            ;;
    esac
}

# Rolling deployment
deploy_rolling() {
    echo -e "${CYAN}Performing rolling deployment...${NC}"
    
    run_command "Updating ECS service" "aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --force-new-deployment --region ${AWS_REGION}"
    run_command "Waiting for deployment to stabilize" "aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION}"
    
    echo -e "${GREEN}✓ Rolling deployment completed${NC}"
}

# Blue-green deployment
deploy_blue_green() {
    echo -e "${CYAN}Performing blue-green deployment...${NC}"
    
    # Create new task definition
    local new_task_def="${SERVICE_NAME}-$(date +%s)"
    
    run_command "Creating new task definition" "aws ecs register-task-definition --family ${new_task_def} --task-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/${SERVICE_NAME}-task-role --execution-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/${SERVICE_NAME}-execution-role --network-mode awsvpc --requires-attributes name=com.amazonaws.ecs.capability.docker-remote-api.1.18,name=ecs.capability.task-eni --cpu 512 --memory 1024 --container-definitions file://task-definition.json --region ${AWS_REGION}"
    
    # Update service with new task definition
    run_command "Switching to new task definition" "aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --task-definition ${new_task_def} --region ${AWS_REGION}"
    run_command "Waiting for deployment to stabilize" "aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION}"
    
    echo -e "${GREEN}✓ Blue-green deployment completed${NC}"
}

# Canary deployment
deploy_canary() {
    echo -e "${CYAN}Performing canary deployment...${NC}"
    
    # Deploy to 10% of traffic first
    run_command "Starting canary deployment (10% traffic)" "aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --desired-count 1 --region ${AWS_REGION}"
    
    # Wait and monitor for 5 minutes
    echo -e "${YELLOW}Monitoring canary for 5 minutes...${NC}"
    if [[ "$DRY_RUN" != "true" ]]; then
        sleep 300
        
        # Check health and metrics
        if curl -f "https://${LOAD_BALANCER_DNS}/api/health" &> /dev/null; then
            echo -e "${GREEN}Canary health check passed${NC}"
            
            # Scale up to full deployment
            run_command "Scaling up to full deployment" "aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --desired-count 3 --region ${AWS_REGION}"
            run_command "Waiting for full deployment" "aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION}"
        else
            echo -e "${RED}Canary health check failed - rolling back${NC}"
            rollback_deployment
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ Canary deployment completed${NC}"
}

# Database migrations
run_database_migrations() {
    echo -e "${PURPLE}=== Running Database Migrations ===${NC}"
    
    run_command "Running database migrations" "./scripts/database-migration.sh ${ENVIRONMENT} deploy"
    
    echo -e "${GREEN}✓ Database migrations completed${NC}"
}

# Post-deployment tests
post_deployment_tests() {
    echo -e "${PURPLE}=== Post-deployment Tests ===${NC}"
    
    local app_url="https://${LOAD_BALANCER_DNS}"
    
    # Health check
    run_command "Health check" "curl -f ${app_url}/api/health"
    
    # Smoke tests
    if [[ -f "tests/smoke.test.js" ]]; then
        run_command "Running smoke tests" "TEST_URL=${app_url} npm run test:smoke"
    fi
    
    # Load test (staging only)
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        run_command "Running basic load test" "autocannon -c 10 -d 30 ${app_url}/api/health"
    fi
    
    echo -e "${GREEN}✓ Post-deployment tests completed${NC}"
}

# Rollback deployment
rollback_deployment() {
    echo -e "${PURPLE}=== Rolling Back Deployment ===${NC}"
    
    # Get previous task definition
    local current_task_def=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --query 'services[0].taskDefinition' --output text --region ${AWS_REGION})
    local family=$(echo $current_task_def | cut -d':' -f1)
    local current_revision=$(echo $current_task_def | cut -d':' -f2)
    local previous_revision=$((current_revision - 1))
    
    if [[ $previous_revision -gt 0 ]]; then
        run_command "Rolling back to previous version" "aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --task-definition ${family}:${previous_revision} --region ${AWS_REGION}"
        run_command "Waiting for rollback to complete" "aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION}"
        
        echo -e "${GREEN}✓ Rollback completed${NC}"
    else
        echo -e "${RED}Error: No previous version found for rollback${NC}"
        exit 1
    fi
}

# Setup monitoring
setup_monitoring() {
    echo -e "${PURPLE}=== Setting up Monitoring ===${NC}"
    
    run_command "Setting up monitoring stack" "./scripts/monitoring-setup.sh ${ENVIRONMENT} aws"
    
    echo -e "${GREEN}✓ Monitoring setup completed${NC}"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    echo -e "${PURPLE}=== Sending Notifications ===${NC}"
    
    # Send Slack notification if webhook is configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" == "failure" ]]; then
            color="danger"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
        fi
        
        local payload="{
            \"attachments\": [{
                \"color\": \"${color}\",
                \"title\": \"Tattoo Marketplace Deployment\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"${ENVIRONMENT}\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"${status}\", \"short\": true},
                    {\"title\": \"Branch\", \"value\": \"$(git branch --show-current)\", \"short\": true},
                    {\"title\": \"Commit\", \"value\": \"$(git rev-parse --short HEAD)\", \"short\": true}
                ],
                \"text\": \"${message}\"
            }]
        }"
        
        if [[ "$DRY_RUN" != "true" ]]; then
            curl -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" || true
        fi
    fi
    
    echo -e "${GREEN}✓ Notifications sent${NC}"
}

# Cleanup
cleanup() {
    echo -e "${PURPLE}=== Cleanup ===${NC}"
    
    # Clean up temporary files
    run_command "Cleaning up temporary files" "rm -f /tmp/deployment-* || true"
    
    # Clean up old Docker images (keep last 5)
    if command -v docker &> /dev/null; then
        run_command "Cleaning up old Docker images" "docker images tattoo-marketplace --format 'table {{.ID}}\t{{.CreatedAt}}' | tail -n +6 | cut -f1 | xargs -r docker rmi || true"
    fi
    
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Main deployment flow
main() {
    local start_time=$(date +%s)
    
    # Get AWS Account ID
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Trap for cleanup on exit
    trap cleanup EXIT
    
    try {
        pre_deployment_checks
        run_tests
        security_scan
        build_and_push
        deploy_infrastructure
        run_database_migrations
        deploy_application
        post_deployment_tests
        setup_monitoring
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${GREEN}🚀 Deployment completed successfully in ${duration} seconds!${NC}"
        echo -e "${BLUE}Application URL: https://${LOAD_BALANCER_DNS}${NC}"
        
        send_notifications "success" "Deployment to ${ENVIRONMENT} completed successfully in ${duration} seconds"
        
    } catch {
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${RED}❌ Deployment failed after ${duration} seconds${NC}"
        
        # Offer rollback option
        if [[ "$DRY_RUN" != "true" && "$ENVIRONMENT" != "development" ]]; then
            echo -e "${YELLOW}Would you like to rollback? (y/n)${NC}"
            read -r rollback_choice
            if [[ "$rollback_choice" == "y" || "$rollback_choice" == "Y" ]]; then
                rollback_deployment
            fi
        fi
        
        send_notifications "failure" "Deployment to ${ENVIRONMENT} failed after ${duration} seconds"
        exit 1
    }
}

# Simple try/catch implementation
try() {
    "$@"
}

catch() {
    echo -e "${RED}Error occurred in deployment process${NC}"
}

# Show usage information
usage() {
    echo "Usage: $0 [environment] [deployment_type] [dry_run] [skip_tests]"
    echo ""
    echo "Arguments:"
    echo "  environment      Environment to deploy to (development|staging|production)"
    echo "  deployment_type  Type of deployment (rolling|blue-green|canary)"
    echo "  dry_run         Whether to run in dry-run mode (true|false)"
    echo "  skip_tests      Whether to skip tests (true|false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging rolling           # Rolling deployment to staging"
    echo "  $0 production blue-green     # Blue-green deployment to production"
    echo "  $0 staging canary true       # Dry-run canary deployment to staging"
    echo "  $0 development rolling false true  # Deploy to dev, skip tests"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION              AWS region (default: us-west-2)"
    echo "  SLACK_WEBHOOK_URL       Slack webhook for notifications"
    echo "  DATABASE_URL            Database connection string"
    echo "  NEXTAUTH_SECRET         NextAuth secret key"
}

# Handle help flag
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

# Execute main function
main