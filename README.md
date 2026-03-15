## Onvera (Next.js + TS + shadcn + Tailwind)

This project now supports:
- Supabase authentication (email/password + OAuth)
- User roles (`agency`, `freelancer`, `project_member`, `team_member`)
- Token-based client onboarding links
- Existing MSW mock APIs for dashboard/project UI development

## 1) Environment setup
Copy `.env.example` to `.env.local` and fill values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_REQUIRE_ONBOARDING_TOKEN=false
NEXT_PUBLIC_USE_MSW=false
```

Set `NEXT_PUBLIC_REQUIRE_ONBOARDING_TOKEN=true` when you want onboarding pages to strictly require `?token=...`.

## 2) Supabase SQL setup
Run:
- `supabase/schema.sql`

This creates:
- `profiles` table with role constraint
- `onboarding_tokens` table
- `templates`, `teams`, `projects` tables
- RLS policies
- `auth.users` trigger to auto-create profile rows

Then seed data from your current MSW JSON:

```bash
npm run seed:supabase
```

## 3) Supabase Auth settings
In Supabase dashboard:
- Enable providers you need (`Google`, `Azure`)
- Add redirect URL:
  - `http://localhost:3000/auth/callback`
  - production callback URL later

## 4) Run project

```bash
npm run dev
```

## 5) How token onboarding works
Agency/freelancer/team-member users can generate token links from project detail:
- `POST /api/onboarding/token`
- Link format: `/onboarding/[slug]?token=...`

Client onboarding page validates token via:
- `GET /api/onboarding/validate?slug=...&token=...`

## 6) MSW note
MSW only starts when `NEXT_PUBLIC_USE_MSW=true`.

- `false` (recommended): app reads from Supabase-backed API routes
- `true`: app uses MSW mock handlers during development
