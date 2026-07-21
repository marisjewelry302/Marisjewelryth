-- Keep customer credentials out of general-purpose JSON metadata.

alter table public.customers
  add column if not exists password_hash text;

update public.customers
   set password_hash = coalesce(password_hash, metadata->>'password_hash', metadata->>'passwordHash'),
       metadata = metadata - 'password_hash' - 'passwordHash'
 where metadata ? 'password_hash'
    or metadata ? 'passwordHash';

comment on column public.customers.password_hash is
  'Server-only scrypt credential hash. Never select this column in public or admin response payloads.';
