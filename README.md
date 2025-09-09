# Tattoo Marketplace - Authentication Setup

A platform that connects tattoo artists with tattoo studios worldwide, similar to Airbnb but for creative workspace.

## Features Implemented

✅ **Authentication System**
- Google OAuth integration
- Magic link email authentication
- User session management
- Responsive sign-in UI

## Quick Start

### 1. Install Dependencies
```bash
cd tattoo-marketplace
npm install
```

### 2. Database Setup
```bash
# Install PostgreSQL and create database
createdb tattoo_marketplace

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push
```

### 3. Environment Configuration

Update `.env.local` with your actual values:

```bash
# Next Auth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-make-it-long-and-random

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tattoo_marketplace"

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration (for magic links)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### 5. Email Setup (Gmail Example)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password in Google Account settings
3. Use the App Password (not your regular password) in `EMAIL_SERVER_PASSWORD`

### 6. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Project Structure

```
tattoo-marketplace/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   │   └── auth/          # NextAuth.js configuration
│   ├── auth/              # Authentication pages
│   │   ├── signin/        # Sign-in page
│   │   └── verify-request/ # Email verification page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Session provider
├── lib/
│   └── auth.ts            # NextAuth.js configuration
├── prisma/
│   └── schema.prisma      # Database schema
└── package.json
```

## Authentication Flows

### Google OAuth
1. User clicks "Continue with Google"
2. Redirected to Google authorization
3. Google redirects back with authorization code
4. NextAuth creates user account and session
5. User redirected to home page

### Magic Link Email
1. User enters email address
2. Magic link sent to email
3. User clicks link in email
4. NextAuth verifies token and creates session
5. User redirected to home page

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key tables:
- `User` - User accounts
- `Account` - OAuth provider accounts
- `Session` - Active user sessions
- `VerificationToken` - Magic link tokens
- `Artist` - Artist profiles (future)
- `Studio` - Studio profiles (future)

## Security Features

- Secure session management with database sessions
- CSRF protection via NextAuth.js
- Email verification for magic links
- OAuth state parameter validation
- Secure cookie configuration

## Next Steps

After authentication is working:
1. Add user profile completion
2. Implement artist/studio role selection
3. Add studio listing functionality
4. Implement booking system
5. Add payment processing

## Troubleshooting

**Database Connection Issues:**
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists

**Google OAuth Issues:**
- Verify redirect URI matches exactly
- Check client ID and secret
- Ensure Google+ API is enabled

**Email Issues:**
- Verify SMTP settings
- Check app password is correct
- Test email connectivity

**General Issues:**
- Clear browser cache and cookies
- Check browser console for errors
- Verify all environment variables are set