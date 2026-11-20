-- SAQR Fleet CRM — Supabase schema with Multi-Tenancy (Companies) & Role-Based Permissions
-- Tables, row-level security (roles + company isolation), auth profile trigger, and the "files" storage bucket.

-- ── 1. companies ─────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_at timestamptz not null default now()
);

-- Default company for initial installation
insert into public.companies (id, name, code)
values ('11111111-1111-1111-1111-111111111111', 'SAQR Transport', 'SAQR-FLEET-01')
on conflict (code) do nothing;

-- ── 2. profiles (one row per login; holds role + company_id) ─────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'Operations' check (role in ('Admin','Operations','Finance')),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111'
);

create or replace function public.app_company_id() returns uuid
language sql stable security definer set search_path = public as
$$ select company_id from public.profiles where id = auth.uid() $$;

create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as
$$ select coalesce((select role from public.profiles where id = auth.uid()), 'Operations') $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  user_role text;
begin
  cid := null;
  if new.raw_user_meta_data->>'company_id' is not null and new.raw_user_meta_data->>'company_id' != '' then
    begin
      cid := (new.raw_user_meta_data->>'company_id')::uuid;
    exception when others then
      cid := null;
    end;
  end if;
  if cid is null then
    cid := '11111111-1111-1111-1111-111111111111';
  end if;

  user_role := coalesce(new.raw_user_meta_data->>'role', 'Operations');
  if user_role not in ('Admin', 'Operations', 'Finance') then
    user_role := 'Operations';
  end if;

  insert into public.profiles (id, email, name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    user_role,
    cid
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    role = coalesce(excluded.role, profiles.role),
    company_id = coalesce(excluded.company_id, profiles.company_id);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. CRM tables ─────────────────────────────────────────────────────────────
create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  plate text not null, make text, model text, year int, type text,
  purchase_price numeric(12,2),
  mulkiya_expiry date, insurance_expiry date,
  mulkiya_file jsonb, insurance_file jsonb,          -- {name, url}
  photos jsonb not null default '[]',                -- [{name, url}]
  status text not null default 'Active' check (status in ('Active','Maintenance','Inactive')),
  unique (company_id, plate)
);
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  name text not null, phone text, licence_no text, licence_expiry date,
  salary numeric(12,2), photo jsonb, licence_file jsonb,
  status text not null default 'Active' check (status in ('Active','On leave','Inactive'))
);
create table if not exists public.trailers (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  number text not null, type text, capacity text, photo jsonb,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  unique (company_id, number)
);
create table if not exists public.fleet_links (       -- truck ↔ driver ↔ trailer pairing
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  truck_id uuid not null unique references public.trucks(id) on delete cascade,
  driver_id uuid unique references public.drivers(id) on delete set null,
  trailer_id uuid unique references public.trailers(id) on delete set null
);
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  name text not null, designation text, phone text, salary numeric(12,2),
  photo jsonb, contract_file jsonb,
  status text not null default 'Active' check (status in ('Active','Inactive'))
);
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  name text not null, contact text, phone text, email text, trade_licence jsonb,
  status text not null default 'Active' check (status in ('Active','Inactive'))
);
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  name text not null, category text not null default 'Other' check (category in ('Fuel','Garage','Parts','Tyres','Other')),
  phone text, email text, trade_licence jsonb,
  status text not null default 'Active' check (status in ('Active','Inactive'))
);
create table if not exists public.brokers (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  name text not null, phone text, commission_pct numeric(5,2) default 0,
  status text not null default 'Active' check (status in ('Active','Inactive'))
);
create table if not exists public.outsource_owners (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  name text not null, phone text, paid numeric(12,2) not null default 0, agreement jsonb,
  status text not null default 'Active' check (status in ('Active','Inactive'))
);
create table if not exists public.truck_costs (       -- diesel / maintenance / fines / advances per truck
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  truck_id uuid not null references public.trucks(id) on delete cascade,
  kind text not null check (kind in ('diesel','maintenance','fine','advance')),
  date date not null default current_date, amount numeric(12,2) not null, note text
);
create table if not exists public.trips (             -- minimal trip record so CRM roll-ups work
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  date date not null default current_date, route text,
  client_id uuid references public.clients(id) on delete set null,
  truck_id uuid references public.trucks(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  broker_id uuid references public.brokers(id) on delete set null,
  outsource_id uuid references public.outsource_owners(id) on delete set null,
  rate numeric(12,2) default 0, outsource_cost numeric(12,2) default 0,
  status text not null default 'Scheduled' check (status in ('Scheduled','In transit','Delivered','Cancelled'))
);
create index if not exists trips_client on public.trips(client_id);
create index if not exists trips_truck on public.trips(truck_id);
create index if not exists trips_driver on public.trips(driver_id);
create index if not exists costs_truck on public.truck_costs(truck_id);

-- ── 4. Row-Level Security ────────────────────────────────────────────────────
alter table public.companies enable row level security;
drop policy if exists "companies_read" on public.companies;
drop policy if exists "companies_insert" on public.companies;
create policy "companies_read" on public.companies for select to anon, authenticated using (true);
create policy "companies_insert" on public.companies for insert to anon, authenticated with check (true);

alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (company_id = public.app_company_id() and (id = auth.uid() or public.app_role() = 'Admin'));
create policy "profiles_update" on public.profiles for update to authenticated
  using (company_id = public.app_company_id() and public.app_role() = 'Admin')
  with check (company_id = public.app_company_id() and public.app_role() = 'Admin');

do $$
declare r record;
begin
  for r in select * from (values
    ('trucks',           array['Admin','Operations','Finance'], array['Admin','Operations'],           array['Admin']),
    ('drivers',          array['Admin','Operations','Finance'], array['Admin','Operations'],           array['Admin']),
    ('trailers',         array['Admin','Operations','Finance'], array['Admin','Operations'],           array['Admin']),
    ('fleet_links',      array['Admin','Operations'],           array['Admin','Operations'],           array['Admin','Operations']),
    ('employees',        array['Admin','Finance'],              array['Admin','Finance'],              array['Admin']),
    ('clients',          array['Admin','Operations','Finance'], array['Admin','Operations','Finance'], array['Admin']),
    ('suppliers',        array['Admin','Operations','Finance'], array['Admin','Operations','Finance'], array['Admin']),
    ('brokers',          array['Admin','Finance'],              array['Admin','Finance'],              array['Admin']),
    ('outsource_owners', array['Admin','Finance'],              array['Admin','Finance'],              array['Admin']),
    ('truck_costs',      array['Admin','Operations','Finance'], array['Admin','Operations','Finance'], array['Admin','Operations','Finance']),
    ('trips',            array['Admin','Operations','Finance'], array['Admin','Operations'],           array['Admin','Operations'])
  ) as v(t, s, w, d) loop
    execute format('alter table public.%I enable row level security', r.t);
    execute format('drop policy if exists %I on public.%I', 'sel_' || r.t, r.t);
    execute format('drop policy if exists %I on public.%I', 'ins_' || r.t, r.t);
    execute format('drop policy if exists %I on public.%I', 'upd_' || r.t, r.t);
    execute format('drop policy if exists %I on public.%I', 'del_' || r.t, r.t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (company_id = public.app_company_id() and public.app_role() = any(%L::text[]))',
      'sel_' || r.t, r.t, r.s
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (company_id = public.app_company_id() and public.app_role() = any(%L::text[]))',
      'ins_' || r.t, r.t, r.w
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (company_id = public.app_company_id() and public.app_role() = any(%L::text[])) with check (company_id = public.app_company_id() and public.app_role() = any(%L::text[]))',
      'upd_' || r.t, r.t, r.w, r.w
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (company_id = public.app_company_id() and public.app_role() = any(%L::text[]))',
      'del_' || r.t, r.t, r.d
    );
  end loop;
end $$;

-- ── 5. File Storage ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('files', 'files', true) on conflict (id) do nothing;
drop policy if exists "files read" on storage.objects;
drop policy if exists "files upload" on storage.objects;
drop policy if exists "files update" on storage.objects;
drop policy if exists "files delete" on storage.objects;
create policy "files read"   on storage.objects for select to authenticated, anon using (bucket_id = 'files');
create policy "files upload" on storage.objects for insert to authenticated, anon with check (bucket_id = 'files');
create policy "files update" on storage.objects for update to authenticated, anon using (bucket_id = 'files') with check (bucket_id = 'files');
create policy "files delete" on storage.objects for delete to authenticated, anon using (bucket_id = 'files');
