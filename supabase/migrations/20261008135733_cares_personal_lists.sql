create function public.cares_valid_list_entries(value jsonb, shared boolean default false)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb; ids text[] := '{}'; item_id text;
begin
  if jsonb_typeof(value) is distinct from 'array' or jsonb_array_length(value) > 30 then return false; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) is distinct from 'object' then return false; end if;
    item_id := item->>'listing_id';
    if item_id is null or item_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or item_id = any(ids) then return false; end if;
    ids := array_append(ids, item_id);
    if shared then
      if item - array['listing_id','comment'] <> '{}'::jsonb or jsonb_typeof(item->'comment') is distinct from 'string' or length(item->>'comment') > 300 then return false; end if;
    else
      if item - array['listing_id','private_note','public_note'] <> '{}'::jsonb
        or jsonb_typeof(item->'private_note') is distinct from 'string' or length(item->>'private_note') > 1000
        or jsonb_typeof(item->'public_note') is distinct from 'string' or length(item->>'public_note') > 300 then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;

create function public.cares_valid_list_snapshot(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(value) is distinct from 'object' or value - array['title','intro','entries'] <> '{}'::jsonb
    or jsonb_typeof(value->'title') is distinct from 'string' or length(btrim(value->>'title')) not between 1 and 80
    or jsonb_typeof(value->'intro') is distinct from 'string' or length(value->>'intro') > 500
    or not public.cares_valid_list_entries(value->'entries', true) then return false; end if;
  return jsonb_array_length(value->'entries') between 1 and 30;
end;
$$;

create table public.cares_personal_lists (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('candidates','recommendations')),
  title text not null check (length(btrim(title)) between 1 and 80),
  entries jsonb not null default '[]'::jsonb check (public.cares_valid_list_entries(entries, false)),
  version integer not null default 1 check (version > 0),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  share_token text check (share_token ~ '^[0-9a-f]{64}$'),
  share_snapshot jsonb check (share_snapshot is null or public.cares_valid_list_snapshot(share_snapshot)),
  shared_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cares_lists_share_state check (
    (share_token is null and share_snapshot is null and shared_version is null)
    or (kind = 'candidates' and share_token is not null and share_snapshot is not null and shared_version is not null and shared_version > 0 and shared_version <= version)
  )
);
create index cares_personal_lists_user_created_idx on public.cares_personal_lists(user_id, created_at desc, id);
create unique index cares_personal_lists_share_token_idx on public.cares_personal_lists(share_token) where share_token is not null;

alter table public.cares_personal_lists enable row level security;
-- All browser access goes through authenticated owner-scoped server routes.
-- Public sharing has its own explicit snapshot projection, never a table SELECT policy.
revoke all on public.cares_personal_lists from public, anon, authenticated;
grant select, insert, update, delete on public.cares_personal_lists to service_role;
revoke all on function public.cares_valid_list_entries(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.cares_valid_list_snapshot(jsonb) from public, anon, authenticated;
grant execute on function public.cares_valid_list_entries(jsonb, boolean) to service_role;
grant execute on function public.cares_valid_list_snapshot(jsonb) to service_role;
