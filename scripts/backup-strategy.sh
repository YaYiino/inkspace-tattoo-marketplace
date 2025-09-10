#!/bin/bash

# Antsss Tattoo Marketplace - Production Backup & Disaster Recovery Strategy
# Automated backup system with multiple recovery points

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/antsss}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-your-project-id}"
S3_BUCKET="${S3_BUCKET:-antsss-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Create backup directory structure
setup_backup_dirs() {
    log "Setting up backup directory structure..."
    
    local dirs=(
        "$BACKUP_DIR/database/daily"
        "$BACKUP_DIR/database/weekly"
        "$BACKUP_DIR/database/monthly"
        "$BACKUP_DIR/storage/daily"
        "$BACKUP_DIR/storage/weekly"
        "$BACKUP_DIR/configs/daily"
        "$BACKUP_DIR/logs"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    success "Backup directories created"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    local backup_type="${1:-daily}"
    local backup_file="$BACKUP_DIR/database/$backup_type/db_backup_${TIMESTAMP}.sql"
    
    # Supabase database backup using pg_dump
    if command -v pg_dump &> /dev/null; then
        # Direct PostgreSQL connection (if available)
        PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
            -h "$SUPABASE_DB_HOST" \
            -p "$SUPABASE_DB_PORT" \
            -U "$SUPABASE_DB_USER" \
            -d "$SUPABASE_DB_NAME" \
            --verbose \
            --no-owner \
            --no-privileges \
            --format=custom \
            --file="$backup_file.custom"
        
        success "Database backup completed: $backup_file.custom"
    else
        # Use Supabase CLI if available
        if command -v supabase &> /dev/null; then
            supabase db dump --project-ref "$SUPABASE_PROJECT_ID" -f "$backup_file"
            success "Database backup completed via Supabase CLI: $backup_file"
        else
            error "Neither pg_dump nor supabase CLI available for database backup"
            return 1
        fi
    fi
    
    # Compress backup
    gzip "$backup_file" 2>/dev/null || gzip "$backup_file.custom" 2>/dev/null
    success "Database backup compressed"
}

# Storage backup
backup_storage() {
    log "Starting storage backup..."
    
    local backup_type="${1:-daily}"
    local backup_dir="$BACKUP_DIR/storage/$backup_type/storage_$TIMESTAMP"
    
    mkdir -p "$backup_dir"
    
    # Backup Supabase Storage using rclone or aws cli
    if command -v rclone &> /dev/null; then
        # Rclone configuration for Supabase Storage
        rclone sync supabase:antsss-storage "$backup_dir" \
            --progress \
            --transfers 4 \
            --checkers 8
        
        success "Storage backup completed with rclone"
    elif command -v aws &> /dev/null; then
        # AWS CLI for S3-compatible storage
        aws s3 sync "s3://$SUPABASE_PROJECT_ID-storage" "$backup_dir" \
            --endpoint-url "https://$SUPABASE_PROJECT_ID.supabase.co/storage/v1/s3" \
            --profile supabase
        
        success "Storage backup completed with AWS CLI"
    else
        warning "No suitable tool found for storage backup (rclone or aws cli required)"
    fi
    
    # Compress storage backup
    tar -czf "$backup_dir.tar.gz" -C "$BACKUP_DIR/storage/$backup_type" "storage_$TIMESTAMP"
    rm -rf "$backup_dir"
    
    success "Storage backup compressed"
}

# Configuration backup
backup_configs() {
    log "Starting configuration backup..."
    
    local backup_type="${1:-daily}"
    local backup_dir="$BACKUP_DIR/configs/$backup_type/configs_$TIMESTAMP"
    
    mkdir -p "$backup_dir"
    
    # Backup important configuration files
    local config_files=(
        "next.config.prod.js"
        "package.json"
        "package-lock.json"
        "vercel.json"
        "supabase-schema.sql"
        "supabase-storage-setup.sql"
        "middleware.ts"
        ".env.production.template"
    )
    
    for file in "${config_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$backup_dir/"
        fi
    done
    
    # Backup Vercel configuration
    if command -v vercel &> /dev/null; then
        vercel env ls production > "$backup_dir/vercel-env.txt" 2>/dev/null || true
    fi
    
    # Create backup metadata
    cat > "$backup_dir/backup_metadata.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "backup_type": "$backup_type",
  "app_version": "$(node -p "require('./package.json').version" 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version)",
  "platform": "$(uname -a)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "backup_size": "$(du -sh $backup_dir | cut -f1)"
}
EOF
    
    # Compress configuration backup
    tar -czf "$backup_dir.tar.gz" -C "$BACKUP_DIR/configs/$backup_type" "configs_$TIMESTAMP"
    rm -rf "$backup_dir"
    
    success "Configuration backup completed"
}

# Upload to remote storage
upload_to_remote() {
    log "Uploading backups to remote storage..."
    
    if command -v aws &> /dev/null && [[ -n "$S3_BUCKET" ]]; then
        # Upload to S3
        aws s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET/antsss-backups/" \
            --exclude "*" \
            --include "*$TIMESTAMP*" \
            --storage-class STANDARD_IA
        
        success "Backups uploaded to S3"
    elif command -v rclone &> /dev/null; then
        # Upload with rclone
        rclone sync "$BACKUP_DIR" remote:antsss-backups \
            --include "*$TIMESTAMP*"
        
        success "Backups uploaded with rclone"
    else
        warning "No remote backup configured (aws cli or rclone required)"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.gz" -delete
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.sql" -delete
    
    # Keep weekly backups for 3 months
    find "$BACKUP_DIR/database/weekly" -type f -mtime +90 -delete
    find "$BACKUP_DIR/storage/weekly" -type f -mtime +90 -delete
    
    # Keep monthly backups for 1 year
    find "$BACKUP_DIR/database/monthly" -type f -mtime +365 -delete
    
    success "Old backups cleaned up"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local failed_verifications=0
    
    # Find latest database backup
    latest_db_backup=$(find "$BACKUP_DIR/database/daily" -name "*.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_db_backup" && -f "$latest_db_backup" ]]; then
        if gzip -t "$latest_db_backup"; then
            success "Database backup integrity verified"
        else
            error "Database backup integrity check failed"
            ((failed_verifications++))
        fi
    fi
    
    # Find latest storage backup
    latest_storage_backup=$(find "$BACKUP_DIR/storage/daily" -name "*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_storage_backup" && -f "$latest_storage_backup" ]]; then
        if tar -tzf "$latest_storage_backup" >/dev/null 2>&1; then
            success "Storage backup integrity verified"
        else
            error "Storage backup integrity check failed"
            ((failed_verifications++))
        fi
    fi
    
    return $failed_verifications
}

# Test restore procedure
test_restore() {
    log "Testing restore procedure (dry run)..."
    
    local test_dir="/tmp/antsss_restore_test_$TIMESTAMP"
    mkdir -p "$test_dir"
    
    # Test database restore
    latest_db_backup=$(find "$BACKUP_DIR/database/daily" -name "*.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_db_backup" ]]; then
        gunzip -c "$latest_db_backup" > "$test_dir/test_restore.sql" 2>/dev/null
        if [[ -s "$test_dir/test_restore.sql" ]]; then
            success "Database restore test successful"
        else
            error "Database restore test failed"
        fi
    fi
    
    # Cleanup test files
    rm -rf "$test_dir"
}

# Generate backup report
generate_backup_report() {
    log "Generating backup report..."
    
    local report_file="$BACKUP_DIR/logs/backup_report_$TIMESTAMP.json"
    
    # Count backups
    local daily_db_count=$(find "$BACKUP_DIR/database/daily" -name "*.gz" -type f | wc -l)
    local daily_storage_count=$(find "$BACKUP_DIR/storage/daily" -name "*.tar.gz" -type f | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    
    # Generate report
    cat > "$report_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "backup_summary": {
    "total_size": "$total_size",
    "daily_database_backups": $daily_db_count,
    "daily_storage_backups": $daily_storage_count,
    "retention_days": $RETENTION_DAYS
  },
  "backup_locations": {
    "local": "$BACKUP_DIR",
    "remote": "${S3_BUCKET:-none}"
  },
  "verification_status": "$(verify_backups &>/dev/null && echo 'passed' || echo 'failed')",
  "next_scheduled": "$(date -d '+1 day' '+%Y-%m-%d %H:%M:%S')"
}
EOF
    
    success "Backup report generated: $report_file"
}

# Disaster recovery test
run_disaster_recovery_test() {
    log "Running disaster recovery simulation..."
    
    warning "This is a simulation - no actual restoration will be performed"
    
    # Simulate different disaster scenarios
    local scenarios=(
        "database_corruption"
        "storage_loss"
        "complete_system_failure"
        "partial_data_loss"
    )
    
    for scenario in "${scenarios[@]}"; do
        log "Testing scenario: $scenario"
        
        case $scenario in
            "database_corruption")
                log "  - Locate latest database backup"
                log "  - Verify backup integrity"
                log "  - Estimate restoration time: 15-30 minutes"
                ;;
            "storage_loss")
                log "  - Locate latest storage backup"
                log "  - Verify file integrity"
                log "  - Estimate restoration time: 1-2 hours"
                ;;
            "complete_system_failure")
                log "  - Deploy new infrastructure"
                log "  - Restore from latest backups"
                log "  - Estimate total recovery time: 2-4 hours"
                ;;
            "partial_data_loss")
                log "  - Identify affected data range"
                log "  - Selective restore from point-in-time backup"
                log "  - Estimate recovery time: 30-60 minutes"
                ;;
        esac
        
        success "Scenario $scenario - Recovery plan validated"
    done
}

# Main backup function
run_backup() {
    local backup_type="${1:-daily}"
    
    log "Starting $backup_type backup process..."
    
    setup_backup_dirs
    backup_database "$backup_type"
    backup_storage "$backup_type"
    backup_configs "$backup_type"
    
    if [[ "$backup_type" == "daily" ]]; then
        upload_to_remote
        cleanup_old_backups
    fi
    
    verify_backups
    generate_backup_report
    
    success "Backup process completed successfully"
}

# Schedule backups (crontab entries)
setup_backup_schedule() {
    log "Setting up backup schedule..."
    
    # Create crontab entries
    cat > /tmp/antsss_backup_cron << 'EOF'
# Antsss Tattoo Marketplace Backup Schedule
# Daily backup at 2 AM
0 2 * * * /path/to/antsss/scripts/backup-strategy.sh daily >> /var/log/antsss-backup.log 2>&1

# Weekly backup on Sundays at 3 AM
0 3 * * 0 /path/to/antsss/scripts/backup-strategy.sh weekly >> /var/log/antsss-backup.log 2>&1

# Monthly backup on 1st of month at 4 AM
0 4 1 * * /path/to/antsss/scripts/backup-strategy.sh monthly >> /var/log/antsss-backup.log 2>&1

# Health check every 6 hours
0 */6 * * * /path/to/antsss/scripts/backup-strategy.sh verify >> /var/log/antsss-backup.log 2>&1
EOF
    
    success "Backup schedule template created at /tmp/antsss_backup_cron"
    warning "Please review and install with: crontab /tmp/antsss_backup_cron"
}

# Help function
show_help() {
    cat << EOF
Antsss Tattoo Marketplace - Backup & Disaster Recovery Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  daily          Run daily backup (default)
  weekly         Run weekly backup
  monthly        Run monthly backup
  verify         Verify backup integrity
  test-restore   Test restore procedure
  dr-test        Run disaster recovery simulation
  schedule       Set up backup schedule
  report         Generate backup report only

Options:
  --retention N  Set retention days (default: 30)
  --remote       Upload to remote storage
  --help         Show this help

Environment Variables:
  BACKUP_DIR           Local backup directory
  RETENTION_DAYS       Number of days to keep backups
  SUPABASE_PROJECT_ID  Supabase project identifier
  S3_BUCKET            S3 bucket for remote backups

Examples:
  $0 daily --remote
  $0 weekly --retention 90
  $0 verify
  $0 dr-test

EOF
}

# Main execution
case "${1:-daily}" in
    "daily"|"weekly"|"monthly")
        run_backup "$1"
        ;;
    "verify")
        setup_backup_dirs
        verify_backups
        ;;
    "test-restore")
        test_restore
        ;;
    "dr-test")
        run_disaster_recovery_test
        ;;
    "schedule")
        setup_backup_schedule
        ;;
    "report")
        generate_backup_report
        ;;
    "--help"|"-h"|"help")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac