-- General website enquiries from the Contact and Request a Quote forms.
--
-- These are kept apart from custom_order_requests on purpose: that table is for
-- enquiries about a specific catalogue piece and requires product_code plus the
-- gem specification columns. A contact enquiry has neither, so forcing it in
-- there would mean a placeholder product code on every row.
--
-- The shape of these forms changes with marketing copy, so only the fields the
-- admin list needs are columns. Everything else the form collected is kept in
-- `fields` so a new question does not need a migration.

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

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  kind text not null,
  full_name text not null,
  email text not null,
  phone text,
  subject text,
  source_page text,
  message text,
  status text not null default 'new',
  fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_kind_check check (kind in ('contact', 'quote')),
  constraint inquiries_status_check check (status in ('new', 'read', 'replied', 'closed'))
);

comment on table public.inquiries is
  'Website contact and quote-request leads. Product-specific enquiries live in custom_order_requests.';
comment on column public.inquiries.fields is
  'Everything the form collected beyond the indexed columns, so form changes do not require a migration.';
comment on column public.inquiries.metadata is
  'Server-side annotations such as the duplicate fingerprint. Never render this to a customer.';

create index if not exists idx_inquiries_status_created_at on public.inquiries(status, created_at desc);
create index if not exists idx_inquiries_email on public.inquiries(lower(email));
create index if not exists idx_inquiries_customer_id on public.inquiries(customer_id);
-- Backs the duplicate check, which looks up the fingerprint of a recent submission.
create index if not exists idx_inquiries_fingerprint on public.inquiries((metadata->>'requestFingerprint'));
-- Backs the per-phone throttle, which counts recent rows for one number.
create index if not exists idx_inquiries_phone_digits on public.inquiries((metadata->>'phoneDigits'));

-- Reached only through the service role in server routes, never from the browser.
alter table public.inquiries enable row level security;

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at
before update on public.inquiries
for each row execute function public.set_maris_updated_at();
