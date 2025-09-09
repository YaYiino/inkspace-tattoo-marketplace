# Infrastructure as Code for Antsss Tattoo Marketplace
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "antsss-terraform-state"
    key    = "tattoo-marketplace/terraform.tfstate"
    region = "us-east-1"
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "antsss-tattoo-marketplace"
}

variable "vercel_team_id" {
  description = "Vercel team ID"
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Supabase access token"
  type        = string
  sensitive   = true
}

# Providers
provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "aws" {
  region = "us-east-1"
}

# Data sources
data "vercel_project_directory" "antsss" {
  path = "."
}

# Locals
locals {
  domain_name = var.environment == "production" ? "antsss.com" : "${var.environment}.antsss.com"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Vercel Project
resource "vercel_project" "antsss" {
  name      = "${var.project_name}-${var.environment}"
  framework = "nextjs"
  
  root_directory = "."
  
  build_command = "npm run build"
  output_directory = ".next"
  install_command = "npm ci"
  
  environment = [
    {
      key    = "NODE_ENV"
      value  = var.environment == "production" ? "production" : var.environment
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_APP_URL"
      value  = "https://${local.domain_name}"
      target = ["production", "preview"]
    }
  ]
  
  git_repository = {
    type = "github"
    repo = "yannickhirt/tattoo-marketplace"
  }
}

# Vercel Domain
resource "vercel_project_domain" "antsss" {
  project_id = vercel_project.antsss.id
  domain     = local.domain_name
}

# AWS CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 7
  
  tags = local.common_tags
}

# AWS S3 Bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-${var.environment}-backups"
  
  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "backups" {
  bucket = aws_s3_bucket.backups.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup_retention"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# AWS CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", "${var.project_name}-${var.environment}"],
            [".", "Errors", ".", "."],
            [".", "Invocations", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1"
          title   = "Lambda Metrics"
          period  = 300
        }
      }
    ]
  })
}

# AWS SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = local.common_tags
}

# AWS CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors lambda errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = "${var.project_name}-${var.environment}"
  }

  tags = local.common_tags
}

# Outputs
output "vercel_project_id" {
  value = vercel_project.antsss.id
}

output "domain_url" {
  value = "https://${local.domain_name}"
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.bucket
}

output "cloudwatch_dashboard_url" {
  value = "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}