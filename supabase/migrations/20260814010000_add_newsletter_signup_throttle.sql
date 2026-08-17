-- Throttle support for public newsletter signups.
--
-- The signup route counts rows created inside a rolling window that share a
-- hashed caller key, mirroring the per-submission throttle on public.inquiries.
-- These indexes back that count so it stays cheap as the list grows.

create index if not exists idx_customer_email_subscribers_client_key
on public.customer_email_subscribers((metadata->>'clientKey'));

create index if not exists idx_customer_email_subscribers_created_at
on public.customer_email_subscribers(created_at desc);
