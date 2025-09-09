# InkSpace - Tattoo Marketplace Setup Guide

## Overview

InkSpace is a modern, conversion-optimized landing page for a tattoo marketplace that connects tattoo artists with available studio space worldwide. Built with Next.js 14, Supabase authentication, and Tailwind CSS.

## Features

✅ **Modern Landing Page**
- Clean, professional design optimized for conversions
- Mobile-first responsive design
- Hero section with clear value proposition
- "How It Works" sections for both artists and studios
- Social proof with testimonials
- Trust elements and security mentions

✅ **Supabase Authentication**
- Role-based signup (Artist or Studio Owner)
- Magic link authentication
- Google OAuth integration ready
- User profile creation with role selection
- Secure session management

✅ **Technical Stack**
- Next.js 14 with App Directory
- TypeScript for type safety
- Tailwind CSS for styling
- Supabase for authentication and database
- @supabase/auth-ui-react for auth UI components

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd tattoo-marketplace
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your project URL and anon key
3. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-actual-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 3. Set Up Database

Run the migration to create the profiles table:

```sql
-- Go to Supabase Dashboard > SQL Editor and run:
-- Copy the content from supabase/migrations/001_create_profiles.sql
```

### 4. Configure Authentication (Optional)

For Google OAuth (optional):
1. Go to Supabase Dashboard > Authentication > Settings
2. Add Google as a provider
3. Update `.env.local` with Google credentials

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Project Structure

```
app/
├── components/
│   ├── AuthModal.tsx       # Authentication modal with role selection
│   ├── Button.tsx         # Reusable button component
│   ├── Card.tsx           # Card component
│   └── Section.tsx        # Section wrapper component
├── auth/
│   └── callback/
│       └── route.ts       # Supabase auth callback handler
├── globals.css           # Global styles with Tailwind
├── layout.tsx           # Root layout with providers
├── page.tsx            # Main landing page
└── providers.tsx       # Supabase session provider

lib/
├── supabase.ts         # Supabase client configuration
└── types.ts           # TypeScript type definitions

supabase/
└── migrations/
    └── 001_create_profiles.sql  # Database schema
```

## Landing Page Sections

1. **Header** - Navigation with authentication status
2. **Hero Section** - Value proposition and main CTAs
3. **Value Propositions** - Benefits for artists and studios
4. **How It Works** - 3-step process for both user types  
5. **Social Proof** - Testimonials and trust indicators
6. **Sign Up Section** - Role selection and authentication
7. **Footer** - Links and company information

## Authentication Flow

1. **Role Selection** - User chooses Artist or Studio Owner
2. **Authentication** - Magic link or Google OAuth
3. **Profile Creation** - User profile created with selected role
4. **Redirect** - Back to landing page with authenticated state

## Customization

### Styling
- Update colors in `tailwind.config.js`
- Modify component styles in individual `.tsx` files
- Global styles in `app/globals.css`

### Content
- Update hero text and CTAs in `app/page.tsx`
- Modify testimonials and social proof
- Customize "How It Works" steps

### Authentication
- Add more OAuth providers in AuthModal
- Customize auth UI appearance
- Add additional profile fields

## Database Schema

The `profiles` table includes:
- `id` - UUID referencing auth.users(id)
- `email` - User email address
- `role` - 'artist' or 'studio'
- `full_name` - Optional display name
- `avatar_url` - Profile image URL
- `bio` - User bio/description
- `location` - Geographic location
- `website` - Personal/business website
- `phone` - Contact phone number
- Automatic timestamps for created_at/updated_at

## Security Features

- Row Level Security (RLS) enabled on profiles table
- Users can only access/modify their own profiles
- Public read access for profiles (for marketplace functionality)
- Secure authentication with Supabase
- CSRF protection via Supabase Auth

## Performance Optimizations

- Next.js App Directory for optimal loading
- Image optimization ready
- Component-based architecture for code splitting
- Tailwind CSS for minimal bundle size
- Lazy loading for auth modal

## Deployment

1. **Vercel** (Recommended)
   ```bash
   npm run build
   # Deploy to Vercel
   ```

2. **Environment Variables**
   - Add Supabase URL and keys to deployment environment
   - Configure redirect URLs in Supabase dashboard

## Next Steps for MVP

1. **Artist Profile Pages** - Detailed artist portfolios
2. **Studio Listings** - Studio space management
3. **Booking System** - Calendar and payment integration
4. **Messaging** - In-app communication
5. **Reviews & Ratings** - Trust and reputation system
6. **Search & Filters** - Discovery functionality

## Support

For issues or questions:
1. Check Supabase documentation
2. Review Next.js App Directory docs
3. Check Tailwind CSS documentation

## License

MIT License - See LICENSE file for details