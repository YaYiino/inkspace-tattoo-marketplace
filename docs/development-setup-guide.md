# Development Setup Guide
## Tattoo Marketplace Platform

This guide provides step-by-step instructions for setting up the development environment with all necessary tools, configurations, and best practices.

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Development Tools Configuration](#3-development-tools-configuration)
4. [Database Setup](#4-database-setup)
5. [Testing Environment](#5-testing-environment)
6. [Code Quality Tools](#6-code-quality-tools)
7. [Docker Development](#7-docker-development)
8. [VS Code Configuration](#8-vs-code-configuration)

---

## 1. Prerequisites

### Required Software
```bash
# Node.js (LTS version)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Package manager
npm install -g pnpm@latest

# Database
brew install postgresql@14
brew install redis

# Docker (for containerized development)
# Download from https://docker.com/products/docker-desktop

# Git and development tools
brew install git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Environment Variables Setup
```bash
# .env.local
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/tattoo_marketplace_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/tattoo_marketplace_dev"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# AWS (for file uploads)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="tattoo-marketplace-dev"

# Email (for development)
EMAIL_SERVER_HOST="smtp.ethereal.email"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-ethereal-user"
EMAIL_SERVER_PASSWORD="your-ethereal-password"
EMAIL_FROM="noreply@tattoo-marketplace.dev"

# Payment processing (Stripe test keys)
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

---

## 2. Project Setup

### Install Dependencies
```bash
# Clone repository
git clone <repository-url>
cd tattoo-marketplace

# Install dependencies
pnpm install

# Setup database
npx prisma generate
npx prisma db push

# Seed development data
npx prisma db seed
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint --fix",
    "lint:check": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset --force",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:build": "docker build -t tattoo-marketplace .",
    
    "prepare": "husky install"
  }
}
```

---

## 3. Development Tools Configuration

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/domain/*": ["./src/domain/*"],
      "@/application/*": ["./src/application/*"],
      "@/infrastructure/*": ["./src/infrastructure/*"],
      "@/types/*": ["./src/types/*"],
      "@/test-utils/*": ["./src/test-utils/*"]
    },
    
    // Strict type checking
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "coverage"
  ]
}
```

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'unused-imports',
  ],
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    
    // Import organization
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    
    // Clean up unused imports
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    
    // Performance
    'react/jsx-key': 'error',
    'react-hooks/exhaustive-deps': 'error',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
```

### Prettier Configuration
```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  
  // Plugin configurations
  pluginSearchDirs: false,
  plugins: [
    'prettier-plugin-organize-imports',
    'prettier-plugin-tailwindcss',
  ],
  
  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },
  ],
};
```

---

## 4. Database Setup

### Prisma Schema Enhancement
```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// User model for NextAuth
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  role          Role      @default(CLIENT)
  
  // Relations
  accounts Account[]
  sessions Session[]
  
  // Profile relations
  artistProfile  Artist? @relation("UserArtist")
  clientProfile  Client? @relation("UserClient")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Artist {
  id              String   @id @default(uuid())
  userId          String   @unique
  name            String
  bio             String   @db.Text
  location        String
  phone           String?
  isVerified      Boolean  @default(false)
  rating          Decimal  @default(0) @db.Decimal(3, 2)
  hourlyRate      Decimal? @db.Decimal(10, 2)
  currency        String   @default("USD")
  
  // Full-text search
  searchVector    Unsupported("tsvector")?
  
  // Relations
  user            User @relation("UserArtist", fields: [userId], references: [id], onDelete: Cascade)
  specialties     ArtistSpecialty[]
  portfolioImages PortfolioImage[]
  designs         TattooDesign[]
  bookings        Booking[]
  reviews         Review[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([location])
  @@index([isVerified])
  @@index([rating(sort: Desc)])
  @@fulltext([name, bio])
  @@map("artists")
}

model TattooDesign {
  id              String   @id @default(uuid())
  artistId        String
  title           String
  description     String   @db.Text
  style           String
  price           Decimal? @db.Decimal(10, 2)
  currency        String   @default("USD")
  estimatedHours  Int
  size            DesignSize
  isAvailable     Boolean  @default(true)
  tags            String[]
  
  // Relations
  artist     Artist           @relation(fields: [artistId], references: [id], onDelete: Cascade)
  images     DesignImage[]
  bookings   Booking[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([artistId])
  @@index([style])
  @@index([isAvailable])
  @@index([price])
  @@fulltext([title, description, tags])
  @@map("tattoo_designs")
}

model Booking {
  id                String        @id @default(uuid())
  artistId          String
  clientId          String
  designId          String?
  scheduledDate     DateTime
  estimatedDuration Int // minutes
  totalPrice        Decimal       @db.Decimal(10, 2)
  depositAmount     Decimal       @db.Decimal(10, 2)
  currency          String        @default("USD")
  status            BookingStatus @default(PENDING)
  notes             String?       @db.Text
  cancelReason      String?
  
  // Relations
  artist Artist      @relation(fields: [artistId], references: [id])
  client Client      @relation(fields: [clientId], references: [id])
  design TattooDesign? @relation(fields: [designId], references: [id])
  payments Payment[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([artistId, scheduledDate])
  @@index([clientId])
  @@index([status])
  @@map("bookings")
}

enum Role {
  ADMIN
  ARTIST
  CLIENT
}

enum DesignSize {
  SMALL
  MEDIUM
  LARGE
  XL
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

### Database Seed Script
```typescript
// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create test users
  const hashedPassword = await hash('password123', 12);
  
  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@tattoo-marketplace.dev',
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  // Create test artists
  const artists = await Promise.all([
    createArtist({
      email: 'mike.ink@example.com',
      name: 'Mike Ink',
      bio: 'Specializing in traditional and neo-traditional tattoos with over 10 years of experience.',
      location: 'New York, NY',
      specialties: ['Traditional', 'Neo-Traditional'],
      hourlyRate: 150,
      isVerified: true,
    }),
    createArtist({
      email: 'sarah.colors@example.com',
      name: 'Sarah Colors',
      bio: 'Watercolor and realism expert. Creating unique, vibrant pieces.',
      location: 'Los Angeles, CA',
      specialties: ['Watercolor', 'Realism'],
      hourlyRate: 200,
      isVerified: true,
    }),
    createArtist({
      email: 'alex.geometric@example.com',
      name: 'Alex Geometric',
      bio: 'Minimalist and geometric designs. Clean lines and perfect symmetry.',
      location: 'Portland, OR',
      specialties: ['Geometric', 'Minimalist'],
      hourlyRate: 120,
      isVerified: false,
    }),
  ]);

  // Create test clients
  const clients = await Promise.all([
    createClient({
      email: 'john.client@example.com',
      name: 'John Client',
    }),
    createClient({
      email: 'jane.client@example.com',
      name: 'Jane Client',
    }),
  ]);

  // Create sample designs
  for (const artist of artists.slice(0, 2)) { // Only verified artists
    await createDesignsForArtist(artist.id);
  }

  // Create sample bookings
  await createSampleBookings(artists[0].id, clients[0].id);

  console.log('Database seeded successfully!');
}

async function createArtist(data: {
  email: string;
  name: string;
  bio: string;
  location: string;
  specialties: string[];
  hourlyRate: number;
  isVerified: boolean;
}) {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: Role.ARTIST,
    },
  });

  const artist = await prisma.artist.create({
    data: {
      userId: user.id,
      name: data.name,
      bio: data.bio,
      location: data.location,
      hourlyRate: data.hourlyRate,
      isVerified: data.isVerified,
      rating: Math.random() * 2 + 3, // Random rating between 3-5
      specialties: {
        create: data.specialties.map(specialty => ({
          name: specialty,
        })),
      },
    },
  });

  return artist;
}

async function createClient(data: { email: string; name: string }) {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: Role.CLIENT,
    },
  });

  const client = await prisma.client.create({
    data: {
      userId: user.id,
      name: data.name,
    },
  });

  return client;
}

async function createDesignsForArtist(artistId: string) {
  const designs = [
    {
      title: 'Traditional Dragon',
      description: 'Classic Japanese-inspired dragon design with bold lines and traditional colors.',
      style: 'Traditional',
      price: 300,
      estimatedHours: 3,
      size: 'MEDIUM',
      tags: ['dragon', 'japanese', 'traditional', 'color'],
    },
    {
      title: 'Minimalist Mountain Range',
      description: 'Clean, geometric mountain silhouette perfect for forearm placement.',
      style: 'Minimalist',
      price: 150,
      estimatedHours: 2,
      size: 'SMALL',
      tags: ['mountain', 'minimalist', 'geometric', 'linework'],
    },
    {
      title: 'Realistic Portrait',
      description: 'Photorealistic black and gray portrait work. Bring your memories to life.',
      style: 'Realism',
      price: 500,
      estimatedHours: 5,
      size: 'LARGE',
      tags: ['portrait', 'realism', 'black-gray', 'memorial'],
    },
  ];

  for (const design of designs) {
    await prisma.tattooDesign.create({
      data: {
        ...design,
        artistId,
      },
    });
  }
}

async function createSampleBookings(artistId: string, clientId: string) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // One week from now

  await prisma.booking.create({
    data: {
      artistId,
      clientId,
      scheduledDate: futureDate,
      estimatedDuration: 180, // 3 hours
      totalPrice: 300,
      depositAmount: 100,
      status: 'PENDING',
      notes: 'First session for a large back piece. Traditional style dragon.',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 5. Testing Environment

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/test-utils/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
};

module.exports = createJestConfig(customJestConfig);
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 6. Code Quality Tools

### Husky Git Hooks
```bash
# Install husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "lint-staged"

# Add commit-msg hook
npx husky add .husky/commit-msg "commitlint --edit $1"
```

### Lint-staged Configuration
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx,json,md}": [
      "prettier --write"
    ]
  }
}
```

### Commitlint Configuration
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semi colons, etc.
        'refactor', // Code restructuring without changing behavior
        'perf',     // Performance improvements
        'test',     // Adding missing tests
        'chore',    // Maintenance tasks
        'ci',       // CI/CD related changes
        'build',    // Build system or dependency changes
        'revert',   // Reverting changes
      ],
    ],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-max-length': [2, 'always', 100],
  },
};
```

---

## 7. Docker Development

### Development Docker Compose
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/tattoo_marketplace_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=tattoo_marketplace_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
  redis_data:
```

### Development Dockerfile
```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["pnpm", "dev"]
```

---

## 8. VS Code Configuration

### Workspace Settings
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  
  "files.associations": {
    "*.css": "tailwindcss"
  },
  
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-playwright.playwright",
    "ms-vscode.test-adapter-converter",
    "orta.vscode-jest",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### Debug Configuration
```json
// .vscode/launch.json
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
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## Quick Start Commands

```bash
# Complete setup from scratch
git clone <repository-url>
cd tattoo-marketplace
cp .env.example .env.local
# Edit .env.local with your values

pnpm install
pnpm db:push
pnpm db:seed

# Start development
pnpm dev

# In separate terminals:
pnpm db:studio    # Database GUI
pnpm test:watch   # Test watcher
```

This development setup ensures a consistent, productive environment with all necessary tools and configurations for building the tattoo marketplace platform.