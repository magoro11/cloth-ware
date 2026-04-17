# AdvanceReWear

**Tagline:** Rent Runway Looks. Resell with Confidence.

AdvanceReWear is a full-stack luxury fashion rental and resale marketplace built with Next.js App Router, TypeScript, Tailwind, Stripe, and role-based workflows.

## Core Capabilities

- Luxury marketplace UI with advanced filtering, sorting, pagination, and wishlist hearts
- Product detail pages with gallery, quote flow, deposit display, reviews, similar items, and policy sections
- Authentication with credentials + Google OAuth (auto-disabled when OAuth env vars are missing)
- Role-based dashboards:
  - `/dashboard/user`
  - `/dashboard/seller`
  - `/dashboard/admin`
- Messaging center between buyers and sellers (`/messages`)
- Stripe Checkout flow with deposit hold and commission transaction tracking
- Admin listing approval workflow (server actions + moderation panel)
- Global UX: dark mode, loading skeletons, toasts, analytics endpoint, error boundary, 404, Terms and Privacy pages

## Tech Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL runtime data layer
- NextAuth v5
- Stripe Checkout
- Supabase SQL + RLS blueprint in `supabase/`

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure `.env`

```env
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_PROJECT_REF:PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

OPENAI_API_KEY=""
```

For Supabase, keep `DATABASE_URL` on the pooler/Prisma connection string and `DIRECT_URL` on the direct database host from the same project. Do not point `DIRECT_URL` at the pooler host.

If you use Vercel Postgres, the app can also fall back to Vercel-provided variables such as `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, and `POSTGRES_URL_NON_POOLING` when `DATABASE_URL` is not set manually.

For authentication, either `AUTH_SECRET`/`AUTH_URL` or `NEXTAUTH_SECRET`/`NEXTAUTH_URL` can be used at runtime. If you define both secret variables, they must be identical.

If you ever change the auth secret, existing JWT session cookies can no longer be decrypted. Sign out and clear the browser cookies for the app before signing in again.

3. Push database and seed

```bash
npm run db:push
npm run db:seed
```

4. Run

```bash
npm run dev
```

## Supabase Production SQL

This repo includes Supabase-first SQL artifacts for production hardening:

- `supabase/migrations/0001_advancerewear_schema.sql`
- `supabase/seed.sql`

They include:

- Required tables (`users`, `profiles`, `listings`, `brands`, `categories`, `rentals`, `purchases`, `reviews`, `messages`, `deposits`, `payouts`, `disputes`, `wishlists`)
- Role types and state enums
- RLS policies for role/ownership access control
- Availability and booking constraints
- Seeded categories, brands, and realistic listing examples

## Key Routes

- `/` Landing page
- `/marketplace` Marketplace filters + pagination
- `/item/[id]` Product details
- `/auth/signin` Auth
- `/dashboard` Role-router entry
- `/dashboard/user` Buyer dashboard
- `/dashboard/seller` Seller dashboard
- `/dashboard/admin` Admin dashboard
- `/messages` Messaging center
- `/terms` and `/privacy`

## Notes

- Platform commission is configured at **10%** in `lib/constants.ts`.
- Listing visibility requires admin approval (`featured = true` in current runtime model).
- Listings with active/pending bookings cannot be edited/deleted.
- Stripe payout release still needs live Connect onboarding + transfer automation per environment.
