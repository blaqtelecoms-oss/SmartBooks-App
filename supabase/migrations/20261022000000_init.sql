-- SmartBooks SA: database schema.
-- Column names kept for app compatibility (incl. created_date / updated_date)
-- so the frontend can keep using the same field names.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_date() returns trigger
language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user'
    check (role in ('admin','user','super_admin','accountant','bookkeeper','business_owner','employee')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Auto-create a profile for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text,
  vat_number text,
  paye_number text,
  uif_number text,
  sdl_number text,
  tax_number text,
  financial_year_end text check (financial_year_end in
    ('January','February','March','April','May','June','July','August','September','October','November','December')),
  industry text,
  address text,
  contact_email text,
  contact_phone text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  owner_id text default (auth.uid())::text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Team membership. user_id holds a user uuid (as text) or, for pending invites, the invited email.
create table public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('super_admin','accountant','bookkeeper','business_owner','employee')),
  permissions text[] default '{}',
  status text not null default 'active' check (status in ('active','invited','inactive')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.company_users (company_id);
create index on public.company_users (user_id);

-- ---------------------------------------------------------------- membership helper (used by RLS)
-- SECURITY DEFINER so policies on company_users don't recurse into themselves.
create or replace function public.is_company_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.companies c
    where c.id = cid and c.owner_id = (auth.uid())::text
  ) or exists (
    select 1 from public.company_users cu
    where cu.company_id = cid
      and cu.status in ('active','invited')
      and (cu.user_id = (auth.uid())::text or lower(cu.user_id) = lower(coalesce(auth.email(), '')))
  );
$$;

-- ---------------------------------------------------------------- accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('asset','liability','equity','income','expense','vat','paye')),
  sub_type text,
  description text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  balance numeric not null default 0,
  normal_side text check (normal_side in ('debit','credit')),
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.accounts (company_id);

-- ---------------------------------------------------------------- allocation_rules
create table public.allocation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  match_field text not null check (match_field in ('description','reference','supplier_name','amount')),
  match_type text not null check (match_type in ('contains','exact','starts_with','range')),
  match_value text not null,
  account_id text not null,
  account_name text,
  vat_applicable boolean not null default false,
  is_active boolean not null default true,
  times_applied numeric not null default 0,
  source text not null default 'manual' check (source in ('manual','ai_learned')),
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.allocation_rules (company_id);

-- ---------------------------------------------------------------- audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id text,
  user_name text,
  action text not null,
  entity_type text,
  entity_id text,
  details text,
  ip_address text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.audit_logs (company_id, created_date desc);

-- ---------------------------------------------------------------- documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank_statement','receipt','invoice','tax_return','report','other')),
  file_url text not null,            -- storage path inside the private "uploads" bucket
  file_type text,
  extracted_data text,
  status text not null default 'uploaded' check (status in ('uploaded','processing','processed','error')),
  submitted boolean not null default false,
  submitted_date date,
  transaction_id text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.documents (company_id, created_date desc);

-- ---------------------------------------------------------------- tax_returns
create table public.tax_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null check (type in ('VAT201','ITR12','ITR14','EMP201','IRP5')),
  period_start text not null,
  period_end text not null,
  status text not null default 'draft' check (status in ('draft','calculated','reviewed','submitted','filed')),
  total_amount numeric default 0,
  data text,
  notes text,
  filed_date text,
  due_date text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.tax_returns (company_id, created_date desc);

-- ---------------------------------------------------------------- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date text not null,
  description text not null,
  amount numeric not null,
  type text check (type in ('debit','credit')),
  account_id text,
  account_name text,
  contra_account_id text,
  contra_account_name text,
  category text,
  vat_amount numeric default 0,
  vat_inclusive boolean default true,
  reference text,
  source text not null default 'manual' check (source in ('bank_statement','manual','invoice','receipt')),
  status text not null default 'unallocated' check (status in ('unallocated','allocated','reviewed','locked')),
  ai_confidence numeric,
  ai_reasoning text,
  is_duplicate boolean default false,
  duplicate_of text,
  receipt_url text,
  invoice_url text,
  supplier_name text,
  bank_name text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.transactions (company_id, date desc);
create index on public.transactions (company_id, status);

-- ---------------------------------------------------------------- updated_date triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','companies','company_users','accounts','allocation_rules',
                           'audit_logs','documents','tax_returns','transactions']
  loop
    execute format('create trigger set_updated_date before update on public.%I
                    for each row execute function public.set_updated_date()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.profiles         enable row level security;
alter table public.companies        enable row level security;
alter table public.company_users    enable row level security;
alter table public.accounts         enable row level security;
alter table public.allocation_rules enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.documents        enable row level security;
alter table public.tax_returns      enable row level security;
alter table public.transactions     enable row level security;

-- profiles: each user reads/updates only their own row (role is NOT user-editable).
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- companies
-- owner_id is checked directly (not only via is_company_member) so that INSERT ... RETURNING works:
-- the STABLE helper cannot see the row being inserted in the same statement.
create policy companies_select on public.companies for select to authenticated
  using (owner_id = (auth.uid())::text or public.is_company_member(id));
create policy companies_insert on public.companies for insert to authenticated
  with check (owner_id = (auth.uid())::text);
create policy companies_update on public.companies for update to authenticated
  using (public.is_company_member(id)) with check (public.is_company_member(id));
create policy companies_delete on public.companies for delete to authenticated
  using (owner_id = (auth.uid())::text);

-- company_users: members can see the team; only the company owner manages it.
create policy company_users_select on public.company_users for select to authenticated
  using (public.is_company_member(company_id));
create policy company_users_insert on public.company_users for insert to authenticated
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (auth.uid())::text));
create policy company_users_update on public.company_users for update to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (auth.uid())::text))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (auth.uid())::text));
create policy company_users_delete on public.company_users for delete to authenticated
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (auth.uid())::text));

-- company-scoped data tables: full access for members of the owning company.
do $$
declare t text;
begin
  foreach t in array array['accounts','allocation_rules','audit_logs','documents','tax_returns','transactions']
  loop
    execute format('create policy %1$s_all on public.%1$s for all to authenticated
                    using (public.is_company_member(company_id))
                    with check (public.is_company_member(company_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- storage: private "uploads" bucket
-- Object path convention: <company_id>/<kind>/<uuid>-<filename>
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 26214400)   -- 25 MB
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create or replace function public.storage_company_id(object_name text) returns uuid
language plpgsql immutable as $$
begin
  return (split_part(object_name, '/', 1))::uuid;
exception when others then
  return null;
end $$;

create policy uploads_select on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and public.is_company_member(public.storage_company_id(name)));
create policy uploads_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and public.is_company_member(public.storage_company_id(name)));
create policy uploads_update on storage.objects for update to authenticated
  using (bucket_id = 'uploads' and public.is_company_member(public.storage_company_id(name)));
create policy uploads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and public.is_company_member(public.storage_company_id(name)));
