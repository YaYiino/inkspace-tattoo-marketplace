#!/bin/bash

# Monitoring and Observability Setup Script for Tattoo Marketplace
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-development}"
SETUP_TYPE="${2:-full}"
AWS_REGION="${AWS_REGION:-us-west-2}"

echo -e "${BLUE}Monitoring Setup Script for Tattoo Marketplace${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Setup Type: ${SETUP_TYPE}"
echo -e "AWS Region: ${AWS_REGION}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install monitoring tools
install_monitoring_tools() {
    echo -e "${PURPLE}Installing monitoring tools...${NC}"
    
    # Install AWS CLI if not present
    if ! command_exists aws; then
        echo -e "${YELLOW}Installing AWS CLI...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install awscli
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf awscliv2.zip aws/
        fi
    fi
    
    # Install CloudWatch CLI tools
    if ! command_exists cw; then
        echo -e "${YELLOW}Installing CloudWatch CLI...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install cw
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            wget -q https://github.com/lucagrulla/cw/releases/latest/download/cw_amd64.deb
            sudo dpkg -i cw_amd64.deb
            rm cw_amd64.deb
        fi
    fi
    
    # Install htop for local monitoring
    if ! command_exists htop; then
        echo -e "${YELLOW}Installing htop...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install htop
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y htop
        fi
    fi
    
    # Install Node.js monitoring tools
    npm install -g clinic
    npm install -g autocannon
    
    echo -e "${GREEN}✓ Monitoring tools installed${NC}"
}

# Setup CloudWatch log groups
setup_cloudwatch_logs() {
    echo -e "${PURPLE}Setting up CloudWatch log groups...${NC}"
    
    # Create log groups
    LOG_GROUPS=(
        "/ecs/tattoo-marketplace-${ENVIRONMENT}"
        "/ecs/tattoo-marketplace-${ENVIRONMENT}-nginx"
        "/aws/lambda/tattoo-marketplace-${ENVIRONMENT}"
        "/aws/rds/instance/tattoo-marketplace-${ENVIRONMENT}/error"
        "/aws/apigateway/tattoo-marketplace-${ENVIRONMENT}"
    )
    
    for log_group in "${LOG_GROUPS[@]}"; do
        if ! aws logs describe-log-groups --log-group-name-prefix "$log_group" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$log_group"; then
            echo -e "Creating log group: $log_group"
            aws logs create-log-group --log-group-name "$log_group" --region "$AWS_REGION"
            
            # Set retention policy based on environment
            if [[ "$ENVIRONMENT" == "production" ]]; then
                RETENTION_DAYS=365
            elif [[ "$ENVIRONMENT" == "staging" ]]; then
                RETENTION_DAYS=90
            else
                RETENTION_DAYS=30
            fi
            
            aws logs put-retention-policy \
                --log-group-name "$log_group" \
                --retention-in-days "$RETENTION_DAYS" \
                --region "$AWS_REGION"
        else
            echo -e "Log group already exists: $log_group"
        fi
    done
    
    echo -e "${GREEN}✓ CloudWatch log groups configured${NC}"
}

# Setup CloudWatch alarms
setup_cloudwatch_alarms() {
    echo -e "${PURPLE}Setting up CloudWatch alarms...${NC}"
    
    # ECS Service Alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "tattoo-marketplace-${ENVIRONMENT}-high-cpu" \
        --alarm-description "High CPU utilization for ECS service" \
        --metric-name CPUUtilization \
        --namespace AWS/ECS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):tattoo-marketplace-${ENVIRONMENT}-alerts" \
        --dimensions Name=ServiceName,Value=tattoo-marketplace-${ENVIRONMENT} Name=ClusterName,Value=tattoo-marketplace-${ENVIRONMENT} \
        --region "$AWS_REGION"
    
    # Database Alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "tattoo-marketplace-${ENVIRONMENT}-db-connections" \
        --alarm-description "High database connections" \
        --metric-name DatabaseConnections \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 50 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):tattoo-marketplace-${ENVIRONMENT}-alerts" \
        --dimensions Name=DBInstanceIdentifier,Value=tattoo-marketplace-${ENVIRONMENT}-db \
        --region "$AWS_REGION"
    
    # Application-specific alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "tattoo-marketplace-${ENVIRONMENT}-5xx-errors" \
        --alarm-description "High 5xx error rate" \
        --metric-name HTTPCode_Target_5XX_Count \
        --namespace AWS/ApplicationELB \
        --statistic Sum \
        --period 300 \
        --threshold 10 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):tattoo-marketplace-${ENVIRONMENT}-alerts" \
        --treat-missing-data notBreaching \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}✓ CloudWatch alarms configured${NC}"
}

# Setup SNS notifications
setup_sns_notifications() {
    echo -e "${PURPLE}Setting up SNS notifications...${NC}"
    
    TOPIC_NAME="tattoo-marketplace-${ENVIRONMENT}-alerts"
    
    # Create SNS topic if it doesn't exist
    if ! aws sns get-topic-attributes --topic-arn "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):${TOPIC_NAME}" --region "$AWS_REGION" >/dev/null 2>&1; then
        TOPIC_ARN=$(aws sns create-topic --name "$TOPIC_NAME" --region "$AWS_REGION" --query 'TopicArn' --output text)
        echo -e "Created SNS topic: $TOPIC_ARN"
    else
        TOPIC_ARN="arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):${TOPIC_NAME}"
        echo -e "SNS topic already exists: $TOPIC_ARN"
    fi
    
    # Subscribe email addresses if provided
    if [[ -n "${ALERT_EMAIL:-}" ]]; then
        aws sns subscribe \
            --topic-arn "$TOPIC_ARN" \
            --protocol email \
            --notification-endpoint "$ALERT_EMAIL" \
            --region "$AWS_REGION"
        echo -e "Added email subscription: $ALERT_EMAIL"
    fi
    
    # Subscribe Slack webhook if provided
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        aws sns subscribe \
            --topic-arn "$TOPIC_ARN" \
            --protocol https \
            --notification-endpoint "$SLACK_WEBHOOK_URL" \
            --region "$AWS_REGION"
        echo -e "Added Slack webhook subscription"
    fi
    
    echo -e "${GREEN}✓ SNS notifications configured${NC}"
}

# Setup Application Insights
setup_application_insights() {
    echo -e "${PURPLE}Setting up Application Insights...${NC}"
    
    # Create resource group for Application Insights
    RESOURCE_GROUP_NAME="tattoo-marketplace-${ENVIRONMENT}-resources"
    
    aws resource-groups create-group \
        --name "$RESOURCE_GROUP_NAME" \
        --resource-query '{
            "Type": "TAG_FILTERS_1_0",
            "Query": "{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"TagFilters\":[{\"Key\":\"Project\",\"Values\":[\"tattoo-marketplace\"]},{\"Key\":\"Environment\",\"Values\":[\"'${ENVIRONMENT}'\"]}]}"
        }' \
        --region "$AWS_REGION" || echo "Resource group already exists"
    
    # Create Application Insights application
    aws applicationinsights create-application \
        --resource-group-name "$RESOURCE_GROUP_NAME" \
        --auto-create \
        --auto-config-enabled \
        --cwe-monitor-enabled \
        --region "$AWS_REGION" || echo "Application Insights already configured"
    
    echo -e "${GREEN}✓ Application Insights configured${NC}"
}

# Setup X-Ray tracing
setup_xray_tracing() {
    echo -e "${PURPLE}Setting up X-Ray tracing...${NC}"
    
    # Create X-Ray sampling rule
    SAMPLING_RULE='{
        "version": 2,
        "default": {
            "fixed_target": 1,
            "rate": 0.1
        },
        "rules": [
            {
                "description": "Tattoo Marketplace API sampling",
                "service_name": "tattoo-marketplace-'${ENVIRONMENT}'",
                "http_method": "*",
                "url_path": "/api/*",
                "fixed_target": 2,
                "rate": 0.1
            }
        ]
    }'
    
    echo "$SAMPLING_RULE" > /tmp/xray-sampling-rules.json
    
    aws xray put-tracing-config \
        --tracing-config 'S3KeyPrefix=xray-traces,S3BucketName=tattoo-marketplace-'${ENVIRONMENT}'-traces' \
        --region "$AWS_REGION" || echo "X-Ray tracing already configured"
    
    aws xray create-sampling-rule \
        --sampling-rule file:///tmp/xray-sampling-rules.json \
        --region "$AWS_REGION" || echo "Sampling rule already exists"
    
    rm /tmp/xray-sampling-rules.json
    
    echo -e "${GREEN}✓ X-Ray tracing configured${NC}"
}

# Setup local monitoring dashboard
setup_local_dashboard() {
    echo -e "${PURPLE}Setting up local monitoring dashboard...${NC}"
    
    # Create monitoring dashboard script
    cat > scripts/monitoring-dashboard.sh << 'EOF'
#!/bin/bash

# Local Monitoring Dashboard
echo "Tattoo Marketplace Monitoring Dashboard"
echo "======================================="

while true; do
    clear
    echo "$(date)"
    echo ""
    
    # System metrics
    echo "System Metrics:"
    echo "CPU Usage: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')"
    echo "Memory Usage: $(free -m 2>/dev/null | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}' || echo "N/A")"
    echo "Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
    echo ""
    
    # Application metrics
    echo "Application Metrics:"
    if curl -s http://localhost:3000/api/health > /tmp/health.json 2>/dev/null; then
        echo "Status: $(jq -r '.status' /tmp/health.json 2>/dev/null || echo "Unknown")"
        echo "Uptime: $(jq -r '.uptime' /tmp/health.json 2>/dev/null | awk '{print int($1/1000/60) " minutes"}' || echo "Unknown")"
        echo "Memory (MB): $(jq -r '.performance.memoryUsage.heapUsed' /tmp/health.json 2>/dev/null | awk '{print int($1/1024/1024)}' || echo "Unknown")"
    else
        echo "Status: Application not responding"
    fi
    echo ""
    
    # Database metrics
    echo "Database Status:"
    if curl -s http://localhost:3000/api/health > /tmp/health.json 2>/dev/null; then
        DB_STATUS=$(jq -r '.checks.database.status' /tmp/health.json 2>/dev/null || echo "unknown")
        echo "Connection: $DB_STATUS"
    else
        echo "Connection: Unable to check"
    fi
    echo ""
    
    # Recent logs
    echo "Recent Errors (last 5):"
    if [[ -f "logs/app.log" ]]; then
        grep -i error logs/app.log | tail -5 || echo "No recent errors"
    else
        echo "Log file not found"
    fi
    
    rm -f /tmp/health.json
    sleep 5
done
EOF
    
    chmod +x scripts/monitoring-dashboard.sh
    
    echo -e "${GREEN}✓ Local monitoring dashboard created${NC}"
}

# Create monitoring configuration files
create_monitoring_configs() {
    echo -e "${PURPLE}Creating monitoring configuration files...${NC}"
    
    # Create CloudWatch agent configuration
    mkdir -p config/monitoring
    
    cat > config/monitoring/cloudwatch-agent.json << EOF
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "root"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/app/*.log",
                        "log_group_name": "/ecs/tattoo-marketplace-${ENVIRONMENT}",
                        "log_stream_name": "{instance_id}-app",
                        "retention_in_days": 30
                    },
                    {
                        "file_path": "/var/log/nginx/*.log",
                        "log_group_name": "/ecs/tattoo-marketplace-${ENVIRONMENT}-nginx",
                        "log_stream_name": "{instance_id}-nginx"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "Tattoo/Marketplace",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF
    
    # Create Grafana dashboard configuration
    cat > config/monitoring/grafana-dashboard.json << EOF
{
    "dashboard": {
        "title": "Tattoo Marketplace - ${ENVIRONMENT}",
        "tags": ["tattoo-marketplace", "${ENVIRONMENT}"],
        "timezone": "browser",
        "panels": [
            {
                "title": "Application Health",
                "type": "stat",
                "targets": [
                    {
                        "expr": "up{job=\"tattoo-marketplace\"}"
                    }
                ]
            },
            {
                "title": "Response Time",
                "type": "graph",
                "targets": [
                    {
                        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
                    }
                ]
            },
            {
                "title": "Error Rate",
                "type": "graph",
                "targets": [
                    {
                        "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
                    }
                ]
            }
        ]
    }
}
EOF
    
    echo -e "${GREEN}✓ Monitoring configuration files created${NC}"
}

# Setup log rotation
setup_log_rotation() {
    echo -e "${PURPLE}Setting up log rotation...${NC}"
    
    sudo tee /etc/logrotate.d/tattoo-marketplace << EOF
/var/log/tattoo-marketplace/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        /bin/systemctl reload tattoo-marketplace 2>/dev/null || true
    endscript
}
EOF
    
    echo -e "${GREEN}✓ Log rotation configured${NC}"
}

# Test monitoring setup
test_monitoring_setup() {
    echo -e "${PURPLE}Testing monitoring setup...${NC}"
    
    # Test health endpoint
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health endpoint accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Health endpoint not accessible (application may not be running)${NC}"
    fi
    
    # Test metrics endpoint
    if curl -f http://localhost:3000/api/metrics > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Metrics endpoint accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Metrics endpoint not accessible${NC}"
    fi
    
    # Test AWS CloudWatch access
    if aws cloudwatch list-metrics --namespace "AWS/ECS" --region "$AWS_REGION" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ CloudWatch access verified${NC}"
    else
        echo -e "${YELLOW}⚠ CloudWatch access not available${NC}"
    fi
    
    # Test SNS topic
    TOPIC_ARN="arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):tattoo-marketplace-${ENVIRONMENT}-alerts"
    if aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" --region "$AWS_REGION" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ SNS topic verified${NC}"
    else
        echo -e "${YELLOW}⚠ SNS topic not found${NC}"
    fi
    
    echo -e "${GREEN}✓ Monitoring setup test completed${NC}"
}

# Generate monitoring documentation
generate_monitoring_docs() {
    echo -e "${PURPLE}Generating monitoring documentation...${NC}"
    
    cat > docs/monitoring-guide.md << EOF
# Monitoring Guide for Tattoo Marketplace

## Overview
This guide covers the monitoring and observability setup for the Tattoo Marketplace platform.

## Components

### Application Monitoring
- **Health Checks**: \`/api/health\` endpoint
- **Metrics**: \`/api/metrics\` endpoint
- **Logging**: Structured JSON logging with multiple levels

### Infrastructure Monitoring
- **CloudWatch**: AWS native monitoring service
- **Application Insights**: Application performance monitoring
- **X-Ray**: Distributed tracing

### Alerting
- **SNS Topics**: \`tattoo-marketplace-${ENVIRONMENT}-alerts\`
- **CloudWatch Alarms**: CPU, Memory, Error rates
- **Email/Slack Notifications**: Configurable endpoints

## Key Metrics

### Application Metrics
- Response time (95th percentile)
- Error rate (4xx, 5xx)
- Request volume
- Active users

### Infrastructure Metrics
- CPU utilization
- Memory usage
- Database connections
- Disk space

### Business Metrics
- User registrations
- Artist signups
- Booking conversions
- Revenue metrics

## Dashboards

### CloudWatch Dashboard
URL: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=tattoo-marketplace-${ENVIRONMENT}-dashboard

### Local Dashboard
Run: \`./scripts/monitoring-dashboard.sh\`

## Alerting Thresholds

### Critical Alerts
- Application down (health check fails)
- High error rate (>5% 5xx errors)
- Database connection failures

### Warning Alerts
- High response time (>5 seconds)
- High CPU usage (>80%)
- High memory usage (>80%)

## Log Locations

### Application Logs
- Local: \`logs/app.log\`
- CloudWatch: \`/ecs/tattoo-marketplace-${ENVIRONMENT}\`

### Database Logs
- CloudWatch: \`/aws/rds/instance/tattoo-marketplace-${ENVIRONMENT}/error\`

## Troubleshooting

### High Response Times
1. Check CPU and memory usage
2. Review database query performance
3. Check for external service latency

### High Error Rates
1. Check application logs for error details
2. Verify database connectivity
3. Check external service availability

### Resource Usage Issues
1. Review CloudWatch metrics
2. Check for memory leaks
3. Analyze traffic patterns

## Monitoring Commands

\`\`\`bash
# View recent logs
cw tail /ecs/tattoo-marketplace-${ENVIRONMENT} --follow

# Check metrics
curl http://localhost:3000/api/metrics | jq

# Run health check
curl http://localhost:3000/api/health | jq

# View CloudWatch alarms
aws cloudwatch describe-alarms --alarm-names "tattoo-marketplace-${ENVIRONMENT}-*"
\`\`\`

## Maintenance

### Regular Tasks
- Review and update alert thresholds monthly
- Clean up old logs and metrics
- Test incident response procedures
- Update monitoring documentation

### Quarterly Tasks
- Review monitoring costs
- Evaluate new monitoring tools
- Conduct monitoring effectiveness review
- Update escalation procedures
EOF
    
    echo -e "${GREEN}✓ Monitoring documentation generated${NC}"
}

# Main execution
main() {
    case "$SETUP_TYPE" in
        "full")
            install_monitoring_tools
            setup_cloudwatch_logs
            setup_cloudwatch_alarms
            setup_sns_notifications
            setup_application_insights
            setup_xray_tracing
            setup_local_dashboard
            create_monitoring_configs
            setup_log_rotation
            test_monitoring_setup
            generate_monitoring_docs
            ;;
        "local")
            install_monitoring_tools
            setup_local_dashboard
            create_monitoring_configs
            setup_log_rotation
            test_monitoring_setup
            ;;
        "aws")
            setup_cloudwatch_logs
            setup_cloudwatch_alarms
            setup_sns_notifications
            setup_application_insights
            setup_xray_tracing
            test_monitoring_setup
            ;;
        *)
            echo -e "${RED}Invalid setup type: $SETUP_TYPE${NC}"
            echo "Valid options: full, local, aws"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Monitoring setup completed successfully!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. Configure alert email addresses: export ALERT_EMAIL=your-email@example.com"
    echo -e "2. Configure Slack webhook: export SLACK_WEBHOOK_URL=your-webhook-url"
    echo -e "3. Start the local dashboard: ./scripts/monitoring-dashboard.sh"
    echo -e "4. Review the monitoring guide: docs/monitoring-guide.md"
}

# Execute main function
main