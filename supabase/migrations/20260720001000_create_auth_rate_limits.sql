-- Durable rate limits for app-owned admin and customer authentication.

create table if not exists public.auth_rate_limits (
  key_hash text primary key,
  action text not null,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_rate_limits_updated_at
  on public.auth_rate_limits(updated_at);

alter table public.auth_rate_limits enable row level security;

create or replace function public.maris_consume_auth_rate_limit(
  p_key_hash text,
  p_action text,
  p_max_attempts integer default 6,
  p_window_seconds integer default 900,
  p_block_seconds integer default 1800,
  p_success boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.auth_rate_limits%rowtype;
  v_now timestamptz := now();
  v_attempts integer;
  v_blocked_until timestamptz;
begin
  if nullif(trim(coalesce(p_key_hash, '')), '') is null
     or nullif(trim(coalesce(p_action, '')), '') is null
     or p_max_attempts < 1
     or p_window_seconds < 1
     or p_block_seconds < 1 then
    raise exception 'Invalid rate-limit parameters.' using errcode = '22023';
  end if;

  if p_success then
    delete from public.auth_rate_limits where key_hash = p_key_hash;
    return jsonb_build_object('allowed', true, 'remaining', p_max_attempts, 'retryAfterSeconds', 0);
  end if;

  insert into public.auth_rate_limits (key_hash, action, attempts, window_started_at, updated_at)
  values (p_key_hash, p_action, 0, v_now, v_now)
  on conflict (key_hash) do nothing;

  select * into v_row
    from public.auth_rate_limits
   where key_hash = p_key_hash
   for update;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer)
    );
  end if;

  if v_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now then
    v_attempts := 1;
    v_blocked_until := null;
    update public.auth_rate_limits
       set action = p_action,
           attempts = v_attempts,
           window_started_at = v_now,
           blocked_until = null,
           updated_at = v_now
     where key_hash = p_key_hash;
  else
    v_attempts := v_row.attempts + 1;
    v_blocked_until := case
      when v_attempts > p_max_attempts then v_now + make_interval(secs => p_block_seconds)
      else null
    end;
    update public.auth_rate_limits
       set action = p_action,
           attempts = v_attempts,
           blocked_until = v_blocked_until,
           updated_at = v_now
     where key_hash = p_key_hash;
  end if;

  return jsonb_build_object(
    'allowed', v_blocked_until is null,
    'remaining', greatest(0, p_max_attempts - v_attempts),
    'retryAfterSeconds', case when v_blocked_until is null then 0 else p_block_seconds end
  );
end;
$$;

revoke all on function public.maris_consume_auth_rate_limit(text, text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.maris_consume_auth_rate_limit(text, text, integer, integer, integer, boolean) to service_role;
