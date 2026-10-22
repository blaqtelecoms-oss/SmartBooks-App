-- SmartBooks SA: Module expansion — bank rules, VAT 201, inventory, Yoco payments, aging, team permissions.

-- =====================================================================
-- Module 1: Bank Feed Rules
-- =====================================================================
create table public.bank_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  keyword text not null,
  target_ledger_account_id text not null,
  target_account_name text,
  vat_code text not null default 'standard' check (vat_code in ('standard','zero_rated','exempt','none')),
  priority integer not null default 0,
  is_active boolean not null default true,
  match_count integer not null default 0,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.bank_rules (company_id);
create index on public.bank_rules (company_id, priority desc);

-- =====================================================================
-- Module 2: VAT classification on transactions
-- =====================================================================
alter table public.transactions
  add column if not exists vat_classification text not null default 'standard'
    check (vat_classification in ('standard','zero_rated','exempt'));

-- =====================================================================
-- Module 3: Inventory & Warehouses
-- =====================================================================
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  location text,
  is_active boolean not null default true,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.warehouses (company_id);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  unit_cost numeric not null default 0,
  selling_price numeric not null default 0,
  reorder_level integer not null default 0,
  is_active boolean not null default true,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.inventory_items (company_id);

create table public.warehouse_stock (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null default 0,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (warehouse_id, item_id)
);
create index on public.warehouse_stock (warehouse_id);
create index on public.warehouse_stock (item_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  from_warehouse_id uuid references public.warehouses(id) on delete set null,
  to_warehouse_id uuid references public.warehouses(id) on delete set null,
  quantity numeric not null,
  movement_type text not null check (movement_type in ('in','out','transfer','adjustment')),
  reference text,
  notes text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now()
);
create index on public.stock_movements (company_id, created_date desc);
create index on public.stock_movements (item_id);

-- =====================================================================
-- Module 4: Yoco Payments
-- =====================================================================
create table public.payment_gateway_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null default 'yoco' check (provider in ('yoco','ozow')),
  api_key text,           -- stored encrypted at the Edge Function level; UI never sees it
  is_active boolean not null default true,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (company_id, provider)
);

-- =====================================================================
-- Module 5: Customers, Suppliers, Invoices (for aging + payment links)
-- =====================================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null check (type in ('customer','supplier')),
  email text,
  phone text,
  address text,
  vat_number text,
  balance numeric not null default 0,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.contacts (company_id, type);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  invoice_number text not null,
  type text not null default 'sales' check (type in ('sales','purchase')),
  issue_date text not null,
  due_date text not null,
  subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','paid','partial','overdue','cancelled')),
  payment_link text,
  payment_provider text,
  payment_reference text,
  notes text,
  created_by text default (auth.email()),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index on public.invoices (company_id, created_date desc);
create index on public.invoices (company_id, status);
create index on public.invoices (contact_id);

-- =====================================================================
-- Module 6: Expand company_users roles
-- =====================================================================
alter table public.company_users
  drop constraint if exists company_users_role_check;
alter table public.company_users
  add constraint company_users_role_check
  check (role in ('super_admin','admin','accountant','bookkeeper','business_owner','auditor','employee'));

-- =====================================================================
-- Triggers: updated_date on all new tables
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'bank_rules','warehouses','inventory_items','warehouse_stock',
    'payment_gateway_settings','contacts','invoices'
  ] loop
    execute format('create trigger set_updated_date before update on public.%I
                    for each row execute function public.set_updated_date()', t);
  end loop;
end $$;

-- =====================================================================
-- RLS on all new tables
-- =====================================================================
alter table public.bank_rules               enable row level security;
alter table public.warehouses               enable row level security;
alter table public.inventory_items          enable row level security;
alter table public.warehouse_stock          enable row level security;
alter table public.stock_movements          enable row level security;
alter table public.payment_gateway_settings  enable row level security;
alter table public.contacts                  enable row level security;
alter table public.invoices                  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'bank_rules','warehouses','inventory_items','warehouse_stock',
    'stock_movements','payment_gateway_settings','contacts','invoices'
  ] loop
    execute format('create policy %1$s_all on public.%1$s for all to authenticated
                    using (public.is_company_member(company_id))
                    with check (public.is_company_member(company_id))', t);
  end loop;
end $$;
