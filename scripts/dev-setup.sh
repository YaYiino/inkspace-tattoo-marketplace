#!/bin/bash

# Antsss Development Environment Setup Script
# This script sets up a comprehensive local development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="20"
DOCKER_COMPOSE_VERSION="2.20.0"
REQUIRED_PORTS=(3000 5432 6379 9200)

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 is installed"
        return 0
    else
        log_error "$1 is not installed"
        return 1
    fi
}

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port $1 is already in use"
        return 1
    else
        log_success "Port $1 is available"
        return 0
    fi
}

# Main setup functions
check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    log_success "Operating system: $OS"
    
    # Check required ports
    for port in "${REQUIRED_PORTS[@]}"; do
        check_port $port
    done
}

install_node() {
    if check_command "node"; then
        NODE_CURRENT=$(node --version | cut -c 2-)
        if [[ "$NODE_CURRENT" < "$NODE_VERSION" ]]; then
            log_warning "Node.js version $NODE_CURRENT is older than required $NODE_VERSION"
            log_info "Please update Node.js to version $NODE_VERSION or higher"
        else
            log_success "Node.js version $NODE_CURRENT meets requirements"
        fi
    else
        log_info "Installing Node.js..."
        if [[ "$OS" == "macos" ]]; then
            if check_command "brew"; then
                brew install node@$NODE_VERSION
            else
                log_error "Homebrew is required to install Node.js on macOS"
                log_info "Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
        elif [[ "$OS" == "linux" ]]; then
            # Install using NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            log_error "Please install Node.js version $NODE_VERSION manually"
            exit 1
        fi
    fi
}

install_development_tools() {
    log_info "Installing development tools..."
    
    # Install global npm packages
    npm install -g \
        @vercel/cli \
        vercel \
        typescript \
        ts-node \
        nodemon \
        concurrently \
        npm-check-updates \
        madge \
        depcheck \
        lighthouse \
        @secretlint/cli
    
    log_success "Global development tools installed"
}

setup_docker() {
    if check_command "docker"; then
        log_success "Docker is installed"
        
        # Check if Docker is running
        if docker info >/dev/null 2>&1; then
            log_success "Docker is running"
        else
            log_warning "Docker is installed but not running"
            log_info "Please start Docker Desktop or Docker service"
        fi
        
        # Check Docker Compose
        if check_command "docker-compose" || docker compose version >/dev/null 2>&1; then
            log_success "Docker Compose is available"
        else
            log_error "Docker Compose is not available"
            exit 1
        fi
    else
        log_error "Docker is not installed"
        log_info "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
}

setup_environment_files() {
    log_info "Setting up environment files..."
    
    # Copy environment template if .env.local doesn't exist
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.development" ]; then
            cp .env.development .env.local
            log_success "Created .env.local from .env.development"
        else
            log_warning ".env.development template not found"
            log_info "Creating basic .env.local..."
            cat > .env.local << EOF
# Local Development Environment
NODE_ENV=development
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Supabase Configuration (Update with your values)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Development Tools
NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_DEBUG_TOOLBAR=true
DEBUG=true
LOG_LEVEL=debug
EOF
        fi
    else
        log_success ".env.local already exists"
    fi
    
    # Validate environment file
    log_info "Validating environment configuration..."
    node -e "
        require('dotenv').config({ path: '.env.local' });
        const missing = [];
        const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
        required.forEach(key => {
            if (!process.env[key] || process.env[key].startsWith('your-')) {
                missing.push(key);
            }
        });
        if (missing.length > 0) {
            console.log('⚠️  Please update the following environment variables in .env.local:');
            missing.forEach(key => console.log('  -', key));
            process.exit(1);
        }
        console.log('✅ Environment configuration is valid');
    " 2>/dev/null || log_warning "Please update environment variables in .env.local"
}

install_project_dependencies() {
    log_info "Installing project dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Project dependencies installed"
}

setup_git_hooks() {
    log_info "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        # Install husky
        npm run prepare
        
        # Make hooks executable
        chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push 2>/dev/null || true
        
        log_success "Git hooks configured"
    else
        log_warning "Not a git repository, skipping Git hooks setup"
    fi
}

setup_database() {
    log_info "Setting up local database..."
    
    # Check if Supabase CLI is available
    if check_command "supabase"; then
        # Start local Supabase
        supabase start || log_warning "Failed to start Supabase locally"
    else
        log_info "Supabase CLI not found, starting database with Docker Compose..."
        
        # Create a minimal docker-compose for database if it doesn't exist
        if [ ! -f "docker-compose.dev.yml" ]; then
            cat > docker-compose.dev.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: antsss_dev
    ports:
      - "54322:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF
        fi
        
        docker-compose -f docker-compose.dev.yml up -d
        log_success "Database services started"
    fi
}

create_development_scripts() {
    log_info "Creating development scripts..."
    
    # Create a comprehensive development script
    cat > scripts/dev.sh << 'EOF'
#!/bin/bash
# Comprehensive development startup script

echo "🚀 Starting Antsss development environment..."

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Wait for database
echo "⏳ Waiting for database..."
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres; do
  sleep 1
done

# Run migrations if available
if [ -f "supabase/migrations" ]; then
    echo "🗄️ Running database migrations..."
    npm run db:migrate
fi

# Start development server with additional tools
concurrently \
  "npm run dev" \
  "npm run type-check -- --watch --preserveWatchOutput" \
  --names "next,tsc" \
  --prefix-colors "blue,yellow"
EOF

    # Make script executable
    chmod +x scripts/dev.sh
    
    # Create other utility scripts
    cat > scripts/test-watch.sh << 'EOF'
#!/bin/bash
# Watch mode testing with coverage
concurrently \
  "npm run test:watch" \
  "npm run test:e2e -- --ui" \
  --names "unit,e2e" \
  --prefix-colors "green,cyan"
EOF
    
    chmod +x scripts/test-watch.sh
    
    log_success "Development scripts created"
}

setup_vscode_config() {
    log_info "Setting up VS Code configuration..."
    
    mkdir -p .vscode
    
    # VS Code settings
    cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.env*": "properties"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/build": true,
    "**/coverage": true
  },
  "eslint.workingDirectories": ["."],
  "typescript.enablePromptUseWorkspaceTsdk": true
}
EOF

    # VS Code extensions recommendations
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-playwright.playwright",
    "ms-vscode.vscode-jest",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-github-issue-pr",
    "github.vscode-pull-request-github",
    "visualstudioexptteam.vscodeintellicode",
    "ms-vscode.vscode-todo-highlight",
    "gruntfuggly.todo-tree",
    "streetsidesoftware.code-spell-checker"
  ]
}
EOF

    # VS Code tasks
    cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Development Server",
      "type": "shell",
      "command": "npm run dev",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "isBackground": true,
      "problemMatcher": {
        "owner": "typescript",
        "source": "ts",
        "applyTo": "closedDocuments",
        "fileLocation": [
          "relative",
          "${workspaceRoot}"
        ],
        "pattern": "$tsc",
        "background": {
          "activeOnStart": true,
          "beginsPattern": ".*",
          "endsPattern": ".*Local:.*"
        }
      }
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "npm run test",
      "group": "test"
    },
    {
      "label": "Run E2E Tests",
      "type": "shell",
      "command": "npm run test:e2e",
      "group": "test"
    },
    {
      "label": "Type Check",
      "type": "shell",
      "command": "npm run type-check",
      "group": "build"
    },
    {
      "label": "Lint",
      "type": "shell",
      "command": "npm run lint",
      "group": "build"
    }
  ]
}
EOF

    # VS Code launch configurations for debugging
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "pwa-chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
EOF
    
    log_success "VS Code configuration created"
}

verify_setup() {
    log_info "Verifying setup..."
    
    # Check if we can build the project
    if npm run build > /dev/null 2>&1; then
        log_success "Build verification passed"
    else
        log_warning "Build verification failed - please check your configuration"
    fi
    
    # Check linting
    if npm run lint > /dev/null 2>&1; then
        log_success "Lint verification passed"
    else
        log_warning "Lint verification failed - some files may need fixing"
    fi
    
    # Check type checking
    if npm run type-check > /dev/null 2>&1; then
        log_success "Type check verification passed"
    else
        log_warning "Type check verification failed - some type errors may exist"
    fi
}

display_help() {
    log_info "Development Environment Setup Complete!"
    echo ""
    echo "🎉 Next steps:"
    echo ""
    echo "1. Update your environment variables in .env.local"
    echo "2. Start the development server:"
    echo "   npm run dev"
    echo ""
    echo "📝 Available scripts:"
    echo "   npm run dev          - Start development server"
    echo "   npm run dev:debug    - Start with debugger attached"
    echo "   npm run test         - Run unit tests"
    echo "   npm run test:watch   - Run tests in watch mode"
    echo "   npm run test:e2e     - Run end-to-end tests"
    echo "   npm run lint         - Lint code"
    echo "   npm run type-check   - Check TypeScript types"
    echo "   npm run build        - Build for production"
    echo ""
    echo "🐳 Docker commands:"
    echo "   docker-compose -f docker-compose.dev.yml up -d   - Start services"
    echo "   docker-compose -f docker-compose.dev.yml down    - Stop services"
    echo ""
    echo "🔧 Development tools:"
    echo "   ./scripts/dev.sh     - Comprehensive dev startup"
    echo "   ./scripts/test-watch.sh - Watch mode testing"
    echo ""
    echo "📚 Documentation:"
    echo "   - README.md          - Project overview"
    echo "   - SETUP.md           - Setup instructions"
    echo "   - BRANCHING_STRATEGY.md - Git workflow"
    echo ""
    echo "🆘 Need help?"
    echo "   - Check the documentation in the docs/ folder"
    echo "   - Review environment variables in .env.local"
    echo "   - Run 'npm run dev' and check for any errors"
}

# Main execution
main() {
    echo "🚀 Setting up Antsss development environment..."
    echo ""
    
    check_system_requirements
    install_node
    install_development_tools
    setup_docker
    install_project_dependencies
    setup_environment_files
    setup_git_hooks
    setup_database
    create_development_scripts
    setup_vscode_config
    verify_setup
    
    echo ""
    display_help
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi