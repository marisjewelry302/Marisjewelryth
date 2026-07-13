-- Immutable stock movement ledger used alongside the editable inventory log.
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  movement_type text not null check (
    movement_type in ('receive', 'reserve', 'release', 'sale', 'damage', 'return', 'adjustment')
  ),
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_product_id
  on public.inventory_movements(product_id);

create index if not exists idx_inventory_movements_variant_id
  on public.inventory_movements(variant_id);

alter table public.inventory_movements enable row level security;
