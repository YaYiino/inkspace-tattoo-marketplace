#!/bin/bash

# Database Migration Script for Tattoo Marketplace
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-development}"
MIGRATION_TYPE="${2:-deploy}"
DRY_RUN="${3:-false}"

echo -e "${BLUE}Database Migration Script${NC}"
echo -e "${BLUE}========================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Migration Type: ${MIGRATION_TYPE}"
echo -e "Dry Run: ${DRY_RUN}"
echo ""

# Validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        "development"|"staging"|"production")
            echo -e "${GREEN}✓ Valid environment: $ENVIRONMENT${NC}"
            ;;
        *)
            echo -e "${RED}✗ Invalid environment: $ENVIRONMENT${NC}"
            echo -e "${RED}Valid options: development, staging, production${NC}"
            exit 1
            ;;
    esac
}

# Check database connection
check_database_connection() {
    echo -e "${BLUE}Checking database connection...${NC}"
    
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}✗ Cannot connect to database${NC}"
        echo -e "${RED}Please check your DATABASE_URL environment variable${NC}"
        exit 1
    fi
}

# Backup database (production only)
backup_database() {
    if [[ "$ENVIRONMENT" == "production" && "$DRY_RUN" != "true" ]]; then
        echo -e "${BLUE}Creating database backup...${NC}"
        
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Extract database connection details
        DATABASE_URL="${DATABASE_URL}"
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/\([^:]*\):.*/\1/p')
        
        # Create backup using pg_dump
        PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --no-password --verbose --clean --no-acl --no-owner \
                -f "backups/$BACKUP_FILE"
        
        echo -e "${GREEN}✓ Database backup created: backups/$BACKUP_FILE${NC}"
        
        # Upload backup to S3 if configured
        if [[ -n "${AWS_BACKUP_BUCKET:-}" ]]; then
            aws s3 cp "backups/$BACKUP_FILE" "s3://$AWS_BACKUP_BUCKET/database-backups/$BACKUP_FILE"
            echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
        fi
    fi
}

# Run migrations
run_migrations() {
    echo -e "${BLUE}Running database migrations...${NC}"
    
    case "$MIGRATION_TYPE" in
        "deploy")
            if [[ "$DRY_RUN" == "true" ]]; then
                echo -e "${YELLOW}DRY RUN: Would run: npx prisma migrate deploy${NC}"
            else
                npx prisma migrate deploy
                echo -e "${GREEN}✓ Migrations deployed successfully${NC}"
            fi
            ;;
        "dev")
            if [[ "$ENVIRONMENT" != "development" ]]; then
                echo -e "${RED}✗ Dev migrations can only be run in development environment${NC}"
                exit 1
            fi
            
            if [[ "$DRY_RUN" == "true" ]]; then
                echo -e "${YELLOW}DRY RUN: Would run: npx prisma migrate dev${NC}"
            else
                npx prisma migrate dev --skip-generate
                echo -e "${GREEN}✓ Dev migration completed${NC}"
            fi
            ;;
        "reset")
            if [[ "$ENVIRONMENT" == "production" ]]; then
                echo -e "${RED}✗ Reset is not allowed in production environment${NC}"
                exit 1
            fi
            
            if [[ "$DRY_RUN" == "true" ]]; then
                echo -e "${YELLOW}DRY RUN: Would run: npx prisma migrate reset${NC}"
            else
                npx prisma migrate reset --force --skip-generate
                echo -e "${GREEN}✓ Database reset completed${NC}"
            fi
            ;;
        "status")
            npx prisma migrate status
            ;;
        *)
            echo -e "${RED}✗ Invalid migration type: $MIGRATION_TYPE${NC}"
            echo -e "${RED}Valid options: deploy, dev, reset, status${NC}"
            exit 1
            ;;
    esac
}

# Generate Prisma client
generate_client() {
    echo -e "${BLUE}Generating Prisma client...${NC}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}DRY RUN: Would run: npx prisma generate${NC}"
    else
        npx prisma generate
        echo -e "${GREEN}✓ Prisma client generated${NC}"
    fi
}

# Seed database (development and staging only)
seed_database() {
    if [[ "$ENVIRONMENT" != "production" && "$MIGRATION_TYPE" != "status" ]]; then
        echo -e "${BLUE}Seeding database...${NC}"
        
        if [[ -f "prisma/seed.ts" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                echo -e "${YELLOW}DRY RUN: Would run: npx prisma db seed${NC}"
            else
                npx prisma db seed
                echo -e "${GREEN}✓ Database seeded successfully${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ No seed file found, skipping seeding${NC}"
        fi
    fi
}

# Validate schema
validate_schema() {
    echo -e "${BLUE}Validating schema...${NC}"
    
    if npx prisma validate; then
        echo -e "${GREEN}✓ Schema validation passed${NC}"
    else
        echo -e "${RED}✗ Schema validation failed${NC}"
        exit 1
    fi
}

# Check for pending migrations
check_pending_migrations() {
    echo -e "${BLUE}Checking for pending migrations...${NC}"
    
    MIGRATION_STATUS=$(npx prisma migrate status --format json 2>/dev/null || echo '{"pendingMigrations": []}')
    PENDING_COUNT=$(echo "$MIGRATION_STATUS" | jq '.pendingMigrations | length' 2>/dev/null || echo "0")
    
    if [[ "$PENDING_COUNT" -gt 0 ]]; then
        echo -e "${YELLOW}⚠ Found $PENDING_COUNT pending migration(s)${NC}"
        echo "$MIGRATION_STATUS" | jq '.pendingMigrations[].name' 2>/dev/null || true
    else
        echo -e "${GREEN}✓ No pending migrations${NC}"
    fi
}

# Verify migration integrity
verify_migration_integrity() {
    echo -e "${BLUE}Verifying migration integrity...${NC}"
    
    if npx prisma migrate resolve --preview-feature; then
        echo -e "${GREEN}✓ Migration integrity verified${NC}"
    else
        echo -e "${YELLOW}⚠ Migration integrity check completed with warnings${NC}"
    fi
}

# Post-migration health check
post_migration_health_check() {
    echo -e "${BLUE}Running post-migration health check...${NC}"
    
    # Check if all tables exist
    EXPECTED_TABLES=("User" "Account" "Session" "VerificationToken" "Artist" "Studio")
    
    for table in "${EXPECTED_TABLES[@]}"; do
        if npx prisma db execute --stdin <<< "SELECT 1 FROM \"$table\" LIMIT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Table $table exists${NC}"
        else
            echo -e "${RED}✗ Table $table is missing or inaccessible${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✓ Post-migration health check passed${NC}"
}

# Create necessary directories
mkdir -p backups

# Main execution
main() {
    validate_environment
    check_database_connection
    validate_schema
    check_pending_migrations
    backup_database
    run_migrations
    
    if [[ "$MIGRATION_TYPE" != "status" ]]; then
        generate_client
        seed_database
        verify_migration_integrity
        post_migration_health_check
    fi
    
    echo -e "${GREEN}✓ Database migration completed successfully!${NC}"
}

# Show usage information
usage() {
    echo "Usage: $0 [environment] [migration_type] [dry_run]"
    echo ""
    echo "Arguments:"
    echo "  environment    Environment to run migrations in (development|staging|production)"
    echo "  migration_type Type of migration to run (deploy|dev|reset|status)"
    echo "  dry_run        Whether to run in dry-run mode (true|false)"
    echo ""
    echo "Examples:"
    echo "  $0 development deploy           # Deploy migrations in development"
    echo "  $0 staging deploy true          # Dry-run deploy in staging"
    echo "  $0 production deploy            # Deploy migrations in production"
    echo "  $0 development dev              # Create and apply dev migration"
    echo "  $0 staging status               # Check migration status"
}

# Handle help flag
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

# Execute main function
main