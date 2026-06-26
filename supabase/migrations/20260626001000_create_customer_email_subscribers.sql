-- Customer marketing popup subscriber and welcome email tracking.

create extension if not exists pgcrypto;

create or replace function public.set_maris_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.customer_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  source text not null default 'account',
  consent boolean not null default true,
  welcome_email_sent_at timestamptz,
  last_welcome_email_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_email_subscribers_customer_id
on public.customer_email_subscribers(customer_id);

create index if not exists idx_customer_email_subscribers_source
on public.customer_email_subscribers(source);

alter table public.customer_email_subscribers enable row level security;

drop trigger if exists set_customer_email_subscribers_updated_at on public.customer_email_subscribers;
create trigger set_customer_email_subscribers_updated_at
before update on public.customer_email_subscribers
for each row execute function public.set_maris_updated_at();
