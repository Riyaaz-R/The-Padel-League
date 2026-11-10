-- Applied to project roqrejjlplrzwavvvmup as "move_role_helpers_to_private_schema".
-- Moves the RLS helper functions out of the API-exposed schema so they cannot be called via /rest/v1/rpc.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.current_role_name() set schema private;
alter function public.is_committee() set schema private;
create or replace function private.is_committee() returns boolean language sql stable set search_path = public, private as $$ select coalesce(private.current_role_name() in ('super_admin','committee_admin'), false) $$;
grant execute on function private.current_role_name() to authenticated;
grant execute on function private.is_committee() to authenticated;
revoke execute on function private.current_role_name() from public, anon;
revoke execute on function private.is_committee() from public, anon;
