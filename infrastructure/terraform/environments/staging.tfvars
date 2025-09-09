# Staging Environment Variables
environment = "staging"
project_name = "antsss-tattoo-marketplace"

# Infrastructure settings
backup_retention_days = 14
log_retention_days = 7
enable_monitoring = true
enable_backups = true

# Domain configuration
domain_name = "staging.antsss.com"

# Notification settings
notification_email = "staging-alerts@antsss.com"

# Additional tags
tags = {
  Environment = "staging"
  Owner       = "qa-team"
  CostCenter  = "engineering"
}