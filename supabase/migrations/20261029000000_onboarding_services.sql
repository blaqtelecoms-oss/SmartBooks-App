-- SmartBooks SA: business onboarding + service catalogue.
-- Ownership itself is already enforced by the RLS policies in 20261022000000_init.sql:
-- every tenant table is gated by public.is_company_member(company_id), companies are
-- created with owner_id = auth.uid(), and the client only holds the anon key, so a
-- signed-in user can only read and write rows of companies they own or belong to.

-- =====================================================================
-- Module 1: Company onboarding flags + business model
-- =====================================================================
alter table public.companies
  add column if not exists offering_type text not null default 'both'
    check (offering_type in ('products','services','both'));

alter table public.companies
  add column if not exists currency text not null default 'ZAR';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'onboarding_completed'
  ) then
    alter table public.companies add column onboarding_completed boolean not null default false;
    -- Businesses that already exist are already trading: only new sign-ups run the wizard.
    update public.companies set onboarding_completed = true;
  end if;
end $$;

-- =====================================================================
-- Module 2: Service catalogue (businesses that sell services, not products)
-- =====================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  rate numeric not null default 0,
  rate_unit text not null default 'hour' check (rate_unit in ('hour','day','session','project','unit')),
  vat_code text not null default 'standard' check (vat_code in ('standard','zero_rated','exempt')),
  is_active boolean not null default true,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists services_company_id_idx on public.services (company_id);

drop trigger if exists set_updated_date on public.services;
create trigger set_updated_date before update on public.services
  for each row execute function public.set_updated_date();

alter table public.services enable row level security;

drop policy if exists services_all on public.services;
create policy services_all on public.services for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
