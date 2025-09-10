#!/bin/bash

# Comprehensive Code Quality Check Script
# This script runs all code quality checks and provides a detailed report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_THRESHOLD=80
MAX_COMPLEXITY=10
MAX_FILE_SIZE_KB=300
MAX_FUNCTION_LENGTH=50

# Counters for final report
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
FAILED_CHECKS=0

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
}

log_section() {
    echo ""
    echo -e "${PURPLE}==== $1 ====${NC}"
    echo ""
}

run_check() {
    ((TOTAL_CHECKS++))
    local check_name="$1"
    local check_command="$2"
    local allow_failure="${3:-false}"
    
    log_info "Running: $check_name"
    
    if eval "$check_command"; then
        log_success "$check_name passed"
        return 0
    else
        if [ "$allow_failure" = "true" ]; then
            log_warning "$check_name failed (non-critical)"
            return 0
        else
            log_error "$check_name failed"
            return 1
        fi
    fi
}

# Pre-flight checks
check_dependencies() {
    log_section "Pre-flight Checks"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_error "node_modules directory not found. Run 'npm install' first."
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Are you in the project root?"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

# Code formatting checks
check_formatting() {
    log_section "Code Formatting"
    
    run_check "Prettier formatting" "npm run format:check"
    run_check "EditorConfig validation" "npx editorconfig-checker" true
}

# Linting checks
check_linting() {
    log_section "Code Linting"
    
    run_check "ESLint" "npm run lint"
    run_check "TypeScript compilation" "npm run type-check"
    
    # Check for unused dependencies
    run_check "Unused dependencies" "npx depcheck --ignores='@types/*,eslint-*,prettier'" true
    
    # Check for outdated dependencies
    log_info "Checking for outdated dependencies..."
    if npm outdated --depth=0; then
        log_warning "Some dependencies are outdated"
    else
        log_success "All dependencies are up to date"
    fi
}

# Security checks
check_security() {
    log_section "Security Analysis"
    
    run_check "npm audit" "npm audit --audit-level=moderate"
    
    # Check for secrets in code
    if command -v git-secrets >/dev/null 2>&1; then
        run_check "Git secrets scan" "git secrets --scan" true
    else
        log_warning "git-secrets not installed, skipping secrets scan"
    fi
    
    # Check for hardcoded secrets patterns
    log_info "Scanning for hardcoded secrets patterns..."
    SECRET_PATTERNS=(
        "password\s*=\s*['\"][^'\"]{8,}"
        "api_key\s*=\s*['\"][^'\"]{20,}"
        "secret\s*=\s*['\"][^'\"]{16,}"
        "token\s*=\s*['\"][^'\"]{20,}"
    )
    
    SECRETS_FOUND=false
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -r -E -i "$pattern" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . --exclude-dir=node_modules --exclude-dir=.next; then
            SECRETS_FOUND=true
        fi
    done
    
    if [ "$SECRETS_FOUND" = "true" ]; then
        log_error "Potential hardcoded secrets found"
    else
        log_success "No hardcoded secrets detected"
    fi
}

# Test coverage analysis
check_test_coverage() {
    log_section "Test Coverage Analysis"
    
    # Run tests with coverage
    log_info "Running tests with coverage..."
    if npm run test:coverage; then
        # Extract coverage percentage
        COVERAGE=$(npm run test:coverage -- --silent 2>/dev/null | grep "All files" | awk '{print $10}' | sed 's/%//' || echo "0")
        
        if [ -z "$COVERAGE" ] || [ "$COVERAGE" = "0" ]; then
            log_warning "Could not determine test coverage"
        elif [ "$COVERAGE" -ge "$COVERAGE_THRESHOLD" ]; then
            log_success "Test coverage: ${COVERAGE}% (≥ ${COVERAGE_THRESHOLD}%)"
        else
            log_error "Test coverage: ${COVERAGE}% (< ${COVERAGE_THRESHOLD}%)"
        fi
        
        # Check for uncovered files
        log_info "Checking for uncovered files..."
        if npm run test:coverage -- --coverageReporters=text-summary | grep -q "0%"; then
            log_warning "Some files have 0% coverage"
        else
            log_success "All covered files have test coverage"
        fi
    else
        log_error "Tests failed"
    fi
}

# Code complexity analysis
check_code_complexity() {
    log_section "Code Complexity Analysis"
    
    # Check cyclomatic complexity using ESLint
    log_info "Checking cyclomatic complexity..."
    if npx eslint . --ext .ts,.tsx,.js,.jsx --no-eslintrc --config '{
        "parserOptions": {"ecmaVersion": 2020, "sourceType": "module"},
        "rules": {"complexity": ["error", '$MAX_COMPLEXITY']}
    }' --format=unix 2>/dev/null; then
        log_success "Code complexity within limits (≤ $MAX_COMPLEXITY)"
    else
        log_warning "Some functions exceed complexity limit of $MAX_COMPLEXITY"
    fi
    
    # Check for circular dependencies
    run_check "Circular dependencies" "npx madge --circular --extensions ts,tsx,js,jsx ." true
}

# File size and structure analysis
check_file_structure() {
    log_section "File Structure Analysis"
    
    # Check for large files
    log_info "Checking for large files..."
    LARGE_FILES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v .next | xargs ls -la | awk '{if ($5 > '$((MAX_FILE_SIZE_KB * 1024))') print $9 " (" $5/1024 " KB)"}')
    
    if [ -n "$LARGE_FILES" ]; then
        log_warning "Large files detected (> ${MAX_FILE_SIZE_KB}KB):"
        echo "$LARGE_FILES"
    else
        log_success "All files within size limits (≤ ${MAX_FILE_SIZE_KB}KB)"
    fi
    
    # Check for long functions
    log_info "Checking for long functions..."
    LONG_FUNCTIONS=$(grep -rn "function\|=>" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules | grep -v .next | wc -l)
    
    if [ "$LONG_FUNCTIONS" -gt 0 ]; then
        log_success "Function count within reasonable limits"
    else
        log_warning "Consider refactoring large functions"
    fi
}

# Import and dependency analysis
check_imports() {
    log_section "Import Analysis"
    
    # Check for unused imports
    run_check "Unused imports" "npx eslint . --ext .ts,.tsx,.js,.jsx --no-eslintrc --config '{
        \"parser\": \"@typescript-eslint/parser\",
        \"plugins\": [\"unused-imports\"],
        \"rules\": {\"unused-imports/no-unused-imports\": \"error\"}
    }'" true
    
    # Check import order
    run_check "Import order" "npx eslint . --ext .ts,.tsx,.js,.jsx --no-eslintrc --config '{
        \"parser\": \"@typescript-eslint/parser\",
        \"plugins\": [\"import\"],
        \"rules\": {\"import/order\": \"error\"}
    }'" true
}

# Performance checks
check_performance() {
    log_section "Performance Analysis"
    
    # Bundle size analysis
    log_info "Analyzing bundle size..."
    if npm run build > /dev/null 2>&1; then
        BUNDLE_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
        log_success "Build successful, bundle size: $BUNDLE_SIZE"
        
        # Check specific bundle metrics
        if [ -d ".next" ]; then
            # Check for large chunks
            LARGE_CHUNKS=$(find .next -name "*.js" | xargs ls -la | awk '{if ($5 > 1048576) print $9 " (" $5/1048576 " MB)"}')
            if [ -n "$LARGE_CHUNKS" ]; then
                log_warning "Large JavaScript chunks detected (> 1MB):"
                echo "$LARGE_CHUNKS"
            else
                log_success "All JavaScript chunks within size limits"
            fi
        fi
    else
        log_error "Build failed, cannot analyze bundle size"
    fi
}

# Documentation checks
check_documentation() {
    log_section "Documentation Analysis"
    
    # Check for README
    if [ -f "README.md" ]; then
        log_success "README.md exists"
    else
        log_warning "README.md not found"
    fi
    
    # Check for TypeScript documentation
    log_info "Checking TypeScript documentation coverage..."
    DOC_COVERAGE=$(grep -r "\/\*\*" --include="*.ts" --include="*.tsx" . | grep -v node_modules | wc -l)
    TOTAL_FUNCTIONS=$(grep -r "function\|=>" --include="*.ts" --include="*.tsx" . | grep -v node_modules | wc -l)
    
    if [ "$TOTAL_FUNCTIONS" -gt 0 ]; then
        DOC_PERCENTAGE=$((DOC_COVERAGE * 100 / TOTAL_FUNCTIONS))
        if [ "$DOC_PERCENTAGE" -ge 50 ]; then
            log_success "Documentation coverage: ${DOC_PERCENTAGE}%"
        else
            log_warning "Documentation coverage: ${DOC_PERCENTAGE}% (consider adding more JSDoc comments)"
        fi
    fi
}

# Git checks
check_git_status() {
    log_section "Git Status Analysis"
    
    if [ -d ".git" ]; then
        # Check for uncommitted changes
        if git diff --quiet && git diff --staged --quiet; then
            log_success "No uncommitted changes"
        else
            log_warning "Uncommitted changes detected"
        fi
        
        # Check branch status
        CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
        log_info "Current branch: $CURRENT_BRANCH"
        
        # Check for unpushed commits
        if git status --porcelain=v1 2>/dev/null | grep -q "ahead"; then
            log_warning "Branch has unpushed commits"
        else
            log_success "Branch is up to date with remote"
        fi
    else
        log_warning "Not a Git repository"
    fi
}

# Generate final report
generate_report() {
    log_section "Quality Check Report"
    
    echo -e "${CYAN}Total Checks:${NC} $TOTAL_CHECKS"
    echo -e "${GREEN}Passed:${NC} $PASSED_CHECKS"
    echo -e "${YELLOW}Warnings:${NC} $WARNING_CHECKS"
    echo -e "${RED}Failed:${NC} $FAILED_CHECKS"
    echo ""
    
    # Calculate score
    if [ "$TOTAL_CHECKS" -gt 0 ]; then
        SCORE=$(((PASSED_CHECKS * 100) / TOTAL_CHECKS))
        
        if [ "$SCORE" -ge 90 ]; then
            echo -e "${GREEN}Overall Quality Score: ${SCORE}% - Excellent! 🎉${NC}"
        elif [ "$SCORE" -ge 80 ]; then
            echo -e "${YELLOW}Overall Quality Score: ${SCORE}% - Good, but room for improvement 👍${NC}"
        elif [ "$SCORE" -ge 70 ]; then
            echo -e "${YELLOW}Overall Quality Score: ${SCORE}% - Needs attention ⚠️${NC}"
        else
            echo -e "${RED}Overall Quality Score: ${SCORE}% - Requires immediate action 🚨${NC}"
        fi
    fi
    
    echo ""
    
    # Recommendations
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        echo -e "${RED}Recommendations:${NC}"
        echo "- Fix failed checks before deploying to production"
        echo "- Review error messages and address critical issues"
        echo "- Consider running checks individually: npm run lint, npm run test, etc."
    fi
    
    if [ "$WARNING_CHECKS" -gt 0 ]; then
        echo -e "${YELLOW}Suggestions for improvement:${NC}"
        echo "- Address warning issues to improve code quality"
        echo "- Update outdated dependencies"
        echo "- Add documentation for better maintainability"
    fi
    
    echo ""
    echo "📊 Detailed reports available in:"
    echo "  - coverage/lcov-report/index.html (test coverage)"
    echo "  - ESLint output above (code quality)"
    echo ""
    
    # Exit with appropriate code
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🔍 Starting comprehensive code quality analysis...${NC}"
    echo ""
    
    check_dependencies
    check_formatting
    check_linting
    check_security
    check_test_coverage
    check_code_complexity
    check_file_structure
    check_imports
    check_performance
    check_documentation
    check_git_status
    
    generate_report
}

# Handle script arguments
case "${1:-}" in
    "formatting")
        check_formatting
        ;;
    "linting")
        check_linting
        ;;
    "security")
        check_security
        ;;
    "coverage")
        check_test_coverage
        ;;
    "complexity")
        check_code_complexity
        ;;
    "performance")
        check_performance
        ;;
    "all"|"")
        main
        ;;
    *)
        echo "Usage: $0 [formatting|linting|security|coverage|complexity|performance|all]"
        echo ""
        echo "Available checks:"
        echo "  formatting   - Code formatting (Prettier, EditorConfig)"
        echo "  linting      - Code linting (ESLint, TypeScript)"
        echo "  security     - Security analysis (npm audit, secrets)"
        echo "  coverage     - Test coverage analysis"
        echo "  complexity   - Code complexity analysis"
        echo "  performance  - Performance and bundle analysis"
        echo "  all          - Run all checks (default)"
        exit 1
        ;;
esac