# Staging Environment Configuration
environment = "staging"

# Networking
vpc_cidr = "10.1.0.0/16"

# Database
db_instance_class        = "db.t3.small"
db_allocated_storage     = 50
db_max_allocated_storage = 200

# Application
desired_count = 2
cpu          = 512
memory       = 1024

# Domain
domain_name = "staging.tattoo-marketplace.com"