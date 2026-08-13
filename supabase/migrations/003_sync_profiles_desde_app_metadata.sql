-- ─────────────────────────────────────────────────────────────────────────────
-- Mantener profiles en sync con auth.users.raw_app_meta_data
--
-- Por qué: la API admin de Supabase inserta el usuario y RECIÉN DESPUÉS escribe
-- app_metadata. El trigger de alta (on_auth_user_created) corre en el insert,
-- cuando app_metadata todavía está vacío, así que cae al default 'gerente' y la
-- región queda en null. Al crear los 23 usuarios del equipo, los 20 editores
-- quedaron como gerente en profiles (el acceso real igual salía del JWT, que sí
-- estaba bien, pero la tabla mentía).
--
-- Con esto profiles se recalcula también en cada update de app_metadata.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.sync_profile_from_auth()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      text;
  v_reg_slug  text;
  v_dist_slug text;
  v_region_id text;
  v_dist_id   text;
begin
  v_role      := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), '');
  v_reg_slug  := coalesce(new.raw_app_meta_data ->> 'region_slug', '');
  v_dist_slug := coalesce(new.raw_app_meta_data ->> 'distributor_slug', '');

  -- Sin rol declarado no se toca nada: evita pisar un perfil bueno con vacío.
  if v_role = '' then
    return new;
  end if;

  if v_role = 'editor' and v_reg_slug != '' then
    select id into v_region_id from public.regions where slug = v_reg_slug limit 1;
  end if;

  if v_role = 'distribuidor' and v_dist_slug != '' then
    select id into v_dist_id from public.distributors where slug = v_dist_slug limit 1;
  end if;

  update public.profiles
     set role           = v_role,
         region_id      = v_region_id,
         distributor_id = v_dist_id
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth();
