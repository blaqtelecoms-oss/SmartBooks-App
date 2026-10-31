-- Email verification codes and password reset tokens for the Resend email flows.
-- Both tables are written and read only by Edge Functions using the service role,
-- so RLS is enabled with no policies (anon/authenticated have no access).

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_user_idx
  on public.email_verification_codes (user_id, created_at desc);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_idx
  on public.password_reset_tokens (user_id, created_at desc);

alter table public.email_verification_codes enable row level security;
alter table public.password_reset_tokens enable row level security;

-- When the account's email was confirmed with a six-digit code.
alter table public.profiles add column if not exists email_verified_at timestamptz;
