# SmartBooks SA

AI-powered South African bookkeeping, tax, and compliance platform.

## Prerequisites

1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.

## Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite.

## Environment Variables

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Backend

This app uses [Supabase](https://supabase.com) as its sole backend:

- **Auth** — Supabase Auth (email/password, Google OAuth)
- **Database** — PostgreSQL with Row Level Security (RLS) for company-based data isolation
- **Storage** — Supabase Storage with a private `uploads` bucket for documents and a public `media` bucket for site assets
- **Edge Functions** — Supabase Edge Functions for AI features (requires Together AI key)

### Supabase Setup

The Supabase project is linked via `supabase/config.toml`. Database schema, RLS policies, and storage buckets are defined in `supabase/migrations/`. Edge Functions live in `supabase/functions/` and are deployed via `supabase functions deploy`.

### Email (Resend)

Account verification and password reset emails, plus customer statements, are sent
from the Supabase Edge Functions in `supabase/functions/` through
[Resend](https://resend.com) from `noreply@smartbooks-app.co.za`.

Set the API key once per project (never in the frontend):

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase functions deploy send-verification-code verify-email-code request-password-reset reset-password send-statement
```

Optional: `APP_BASE_URL` (e.g. `https://app.example.co.za`) pins the origin used in
password reset links; without it the link uses the origin of the reset request.

## Build

```bash
npm run build
```

## Deploy

Deploy the frontend to your hosting provider of choice (Vercel, Netlify, etc.) and ensure the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables are set.
