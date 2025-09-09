# Production Environment Configuration
environment = "production"

# Networking
vpc_cidr = "10.2.0.0/16"

# Database
db_instance_class        = "db.r6g.large"
db_allocated_storage     = 100
db_max_allocated_storage = 1000

# Application
desired_count = 3
cpu          = 1024
memory       = 2048

# Domain
domain_name = "tattoo-marketplace.com"