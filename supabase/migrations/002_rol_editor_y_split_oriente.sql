-- ─────────────────────────────────────────────────────────────────────────────
-- Fritz Calculadora — Rol "editor" (alcance por región) + split de Oriente
--
-- Idempotente: se puede correr más de una vez sin romper nada.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SPLIT DE ORIENTE
--    La región existente "2" (Oriente) pasa a ser Oriente Norte y se crea
--    Oriente Sur. El reparto sale de la hoja EquipoFritz.
-- ─────────────────────────────────────────────────────────────────────────────
update public.regions
   set name = 'Oriente Norte',
       slug = 'oriente-norte'
 where id = '2' and slug = 'oriente';

insert into public.regions (id, name, slug)
values ('7', 'Oriente Sur', 'oriente-sur')
on conflict (id) do nothing;

-- Los que pasan a Oriente Sur. El resto de la vieja Oriente queda en Norte.
update public.distributors
   set region_id = '7'
 where slug in ('grupo-sonreir', 'fys-distribucion');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ROL EDITOR
--    Ve y edita solo los distribuidores de su región. El rol y la región viven
--    en app_metadata del usuario (role + region_slug), igual que distribuidor.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add  constraint profiles_role_check
  check (role in ('gerente', 'editor', 'distribuidor'));

alter table public.profiles
  add column if not exists region_id text references public.regions(id);

create index if not exists idx_profiles_region_id on public.profiles(region_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HELPERS RLS
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_region_slug()
returns text language sql stable security definer as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'region_slug', '')
$$;

create or replace function public.current_region_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.regions where slug = public.current_region_slug() limit 1
$$;

-- Región del distribuidor logueado (para que vea el nombre de su región)
create or replace function public.current_distributor_region_id()
returns text language sql stable security definer set search_path = public as $$
  select region_id from public.distributors
   where slug = public.current_distributor_slug()
   limit 1
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER DE ALTA — ahora también resuelve la región del editor
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      text;
  v_slug      text;
  v_reg_slug  text;
  v_dist_id   text;
  v_region_id text;
begin
  v_role     := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'gerente');
  v_slug     := coalesce(new.raw_app_meta_data ->> 'distributor_slug', '');
  v_reg_slug := coalesce(new.raw_app_meta_data ->> 'region_slug', '');

  if v_role = 'distribuidor' and v_slug != '' then
    select id into v_dist_id
    from public.distributors
    where slug = v_slug
    limit 1;
  end if;

  if v_role = 'editor' and v_reg_slug != '' then
    select id into v_region_id
    from public.regions
    where slug = v_reg_slug
    limit 1;
  end if;

  insert into public.profiles (id, role, distributor_id, region_id, display_name)
  values (
    new.id,
    v_role,
    v_dist_id,
    v_region_id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — REGIONS
--    gerente: todas. editor: la suya. distribuidor: la de su distribuidor.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "regions_select" on public.regions;
create policy "regions_select"
  on public.regions for select
  to authenticated
  using (
    public.current_user_role() = 'gerente'
    or (public.current_user_role() = 'editor'       and id = public.current_region_id())
    or (public.current_user_role() = 'distribuidor' and id = public.current_distributor_region_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — DISTRIBUTORS
--    Antes era "todos los autenticados ven todo". Ahora cada rol ve su alcance.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "distributors_select" on public.distributors;
create policy "distributors_select"
  on public.distributors for select
  to authenticated
  using (
    public.current_user_role() = 'gerente'
    or (public.current_user_role() = 'editor'       and region_id = public.current_region_id())
    or (public.current_user_role() = 'distribuidor' and slug      = public.current_distributor_slug())
  );

-- El editor puede editar los distribuidores de su región (no crear ni borrar
-- fuera de ella: el with check lo ata a la misma región).
drop policy if exists "distributors_write_editor" on public.distributors;
create policy "distributors_write_editor"
  on public.distributors for update
  to authenticated
  using      (public.current_user_role() = 'editor' and region_id = public.current_region_id())
  with check (public.current_user_role() = 'editor' and region_id = public.current_region_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS — MONTHLY_ENTRIES
--    El editor lee y escribe las entradas de los distribuidores de su región.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "entries_select_editor" on public.monthly_entries;
create policy "entries_select_editor"
  on public.monthly_entries for select
  to authenticated
  using (
    public.current_user_role() = 'editor'
    and distributor_id in (
      select id from public.distributors
      where region_id = public.current_region_id()
    )
  );

drop policy if exists "entries_insert_editor" on public.monthly_entries;
create policy "entries_insert_editor"
  on public.monthly_entries for insert
  to authenticated
  with check (
    public.current_user_role() = 'editor'
    and distributor_id in (
      select id from public.distributors
      where region_id = public.current_region_id()
    )
  );

drop policy if exists "entries_update_editor" on public.monthly_entries;
create policy "entries_update_editor"
  on public.monthly_entries for update
  to authenticated
  using (
    public.current_user_role() = 'editor'
    and distributor_id in (
      select id from public.distributors
      where region_id = public.current_region_id()
    )
  )
  with check (
    public.current_user_role() = 'editor'
    and distributor_id in (
      select id from public.distributors
      where region_id = public.current_region_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS — PROFILES
--    El gerente sigue viendo todos; el editor ve los de su región.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'gerente'
    or (public.current_user_role() = 'editor' and region_id = public.current_region_id())
  );
