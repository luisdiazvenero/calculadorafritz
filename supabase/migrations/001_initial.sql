-- ─────────────────────────────────────────────────────────────────────────────
-- Fritz Calculadora — Schema inicial
-- ─────────────────────────────────────────────────────────────────────────────

-- TIPO ENUM
create type distributor_status as enum ('active', 'paused', 'inactive');

-- ─────────────────────────────────────────────────────────────────────────────
-- REGIONES
-- ─────────────────────────────────────────────────────────────────────────────
create table public.regions (
  id    text primary key,
  name  text not null unique,
  slug  text not null unique
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DISTRIBUIDORES
-- ─────────────────────────────────────────────────────────────────────────────
create table public.distributors (
  id         text               primary key,
  region_id  text               not null references public.regions(id),
  name       text               not null,
  slug       text               not null unique,
  status     distributor_status not null default 'active',
  email      text               not null unique
);

create index idx_distributors_region_id on public.distributors(region_id);
create index idx_distributors_slug      on public.distributors(slug);
create index idx_distributors_status    on public.distributors(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTRADAS MENSUALES
-- ─────────────────────────────────────────────────────────────────────────────
create table public.monthly_entries (
  id                        text         primary key,  -- "{distributor_id}-{year}-{month}"
  distributor_id            text         not null references public.distributors(id) on delete cascade,
  period_year               integer      not null check (period_year >= 2020),
  period_month              integer      not null check (period_month between 1 and 12),
  total_cartera             integer      not null,
  pct_activacion            numeric(6,4) not null,
  pct_clientes_fritz        numeric(6,4) not null,
  pct_incremento_activos    numeric(6,4) not null,
  pct_incremento_fritz      numeric(6,4) not null,
  total_skus_fritz          integer      not null,
  pct_incremento_skus       numeric(8,4) not null,
  cajas_promedio            integer      not null,
  pct_incremento_sell_out   numeric(6,4) not null,
  num_vendedores            integer      not null,
  pct_incremento_vendedores numeric(6,4) not null,
  margen_ganancia           numeric(6,4) not null,
  rebate                    numeric(6,4) not null,
  comentarios               text         not null default '',
  -- Targets — los pone el gerente, no el distribuidor
  meta_activacion           numeric(6,4),
  meta_fritz                numeric(6,4),
  meta_skus                 integer,
  meta_cajas                integer,
  -- Auditoría
  created_at                timestamptz  not null default now(),
  updated_at                timestamptz  not null default now(),
  unique (distributor_id, period_year, period_month)
);

create index idx_monthly_entries_dist       on public.monthly_entries(distributor_id);
create index idx_monthly_entries_period     on public.monthly_entries(period_year desc, period_month desc);
create index idx_monthly_entries_dist_per   on public.monthly_entries(distributor_id, period_year desc, period_month desc);

-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger monthly_entries_updated_at
  before update on public.monthly_entries
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PERFILES DE USUARIO
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id             uuid        primary key references auth.users(id) on delete cascade,
  role           text        not null check (role in ('gerente', 'distribuidor')),
  distributor_id text        references public.distributors(id),
  display_name   text,
  created_at     timestamptz not null default now()
);

create index idx_profiles_role           on public.profiles(role);
create index idx_profiles_distributor_id on public.profiles(distributor_id);

-- Trigger: crea perfil automáticamente al crear usuario en Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role    text;
  v_slug    text;
  v_dist_id text;
begin
  v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'gerente');
  v_slug := coalesce(new.raw_app_meta_data ->> 'distributor_slug', '');

  if v_role = 'distribuidor' and v_slug != '' then
    select id into v_dist_id
    from public.distributors
    where slug = v_slug
    limit 1;
  end if;

  insert into public.profiles (id, role, distributor_id, display_name)
  values (
    new.id,
    v_role,
    v_dist_id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIONES HELPER PARA RLS (leen del JWT, sin consulta DB)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.current_distributor_slug()
returns text language sql stable security definer as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'distributor_slug', '')
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.regions         enable row level security;
alter table public.distributors    enable row level security;
alter table public.monthly_entries enable row level security;
alter table public.profiles        enable row level security;

-- REGIONS: lectura para todos los usuarios autenticados
create policy "regions_select"
  on public.regions for select
  to authenticated
  using (true);

-- DISTRIBUTORS: todos leen, solo gerente escribe
create policy "distributors_select"
  on public.distributors for select
  to authenticated
  using (true);

create policy "distributors_write_gerente"
  on public.distributors for all
  to authenticated
  using  (public.current_user_role() = 'gerente')
  with check (public.current_user_role() = 'gerente');

-- MONTHLY_ENTRIES: gerente ve y escribe todo; distribuidor solo ve y escribe los suyos
create policy "entries_select_gerente"
  on public.monthly_entries for select
  to authenticated
  using (public.current_user_role() = 'gerente');

create policy "entries_select_distribuidor"
  on public.monthly_entries for select
  to authenticated
  using (
    public.current_user_role() = 'distribuidor'
    and distributor_id = (
      select id from public.distributors
      where slug = public.current_distributor_slug()
      limit 1
    )
  );

create policy "entries_write_gerente"
  on public.monthly_entries for all
  to authenticated
  using  (public.current_user_role() = 'gerente')
  with check (public.current_user_role() = 'gerente');

create policy "entries_insert_distribuidor"
  on public.monthly_entries for insert
  to authenticated
  with check (
    public.current_user_role() = 'distribuidor'
    and distributor_id = (
      select id from public.distributors
      where slug = public.current_distributor_slug()
      limit 1
    )
  );

create policy "entries_update_distribuidor"
  on public.monthly_entries for update
  to authenticated
  using (
    public.current_user_role() = 'distribuidor'
    and distributor_id = (
      select id from public.distributors
      where slug = public.current_distributor_slug()
      limit 1
    )
  )
  with check (
    public.current_user_role() = 'distribuidor'
    and distributor_id = (
      select id from public.distributors
      where slug = public.current_distributor_slug()
      limit 1
    )
  );

-- PROFILES: cada usuario ve el suyo; gerente ve todos
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.current_user_role() = 'gerente');

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using  (id = auth.uid())
  with check (
    id = auth.uid()
    -- Impide que el usuario cambie su propio rol
    and role = (select role from public.profiles where id = auth.uid())
  );
