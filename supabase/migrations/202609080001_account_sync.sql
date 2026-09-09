begin;

create table public.rainbow_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('session', 'setup')),
  record_id uuid not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 1048576),
  version bigint not null check (version > 0),
  mutation_id uuid not null,
  primary key (user_id, kind, record_id),
  check (payload->>'id' is not null and payload->>'id' = record_id::text)
);
alter table public.rainbow_records enable row level security;
revoke all on public.rainbow_records from public, anon, authenticated;
grant select on public.rainbow_records to authenticated;
create policy rainbow_read_own on public.rainbow_records for select to authenticated
  using ((select auth.uid()) = user_id);

-- Every mutation has a version precondition and is scoped to the caller, never a supplied owner.
create function public.rainbow_write_record(
  p_kind text, p_record_id uuid, p_payload jsonb, p_expected_version bigint, p_mutation_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_record public.rainbow_records;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('session', 'setup') or p_record_id is null or p_mutation_id is null
     or p_expected_version is null or p_expected_version < 0 or p_payload is null
     or jsonb_typeof(p_payload) <> 'object' or p_payload->>'id' is distinct from p_record_id::text
     or octet_length(p_payload::text) > 1048576 then
    raise exception 'Invalid training record' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || ':' || p_kind || ':' || p_record_id::text, 0));
  select * into current_record from public.rainbow_records
    where user_id = owner_id and kind = p_kind and record_id = p_record_id;
  if found then
    if current_record.mutation_id = p_mutation_id or current_record.version <> p_expected_version then
      return to_jsonb(current_record);
    end if;
    update public.rainbow_records set payload = p_payload, version = version + 1, mutation_id = p_mutation_id
      where user_id = owner_id and kind = p_kind and record_id = p_record_id returning * into current_record;
  else
    if p_expected_version <> 0 then raise exception 'Missing cloud record' using errcode = '22023'; end if;
    insert into public.rainbow_records values (owner_id, p_kind, p_record_id, p_payload, 1, p_mutation_id)
      returning * into current_record;
  end if;
  return to_jsonb(current_record);
end;
$$;
revoke all on function public.rainbow_write_record(text, uuid, jsonb, bigint, uuid) from public, anon, authenticated;
grant execute on function public.rainbow_write_record(text, uuid, jsonb, bigint, uuid) to authenticated;
commit;
