# Development Environment Configuration
environment = "dev"

# Networking
vpc_cidr = "10.0.0.0/16"

# Database
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 100

# Application
desired_count = 1
cpu          = 256
memory       = 512

# Domain
domain_name = "dev.tattoo-marketplace.com"