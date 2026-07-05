-- Esquema de Pau's Cookies
-- Pega este archivo completo en Supabase: SQL Editor -> New query -> Run

create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Pau''s Cookies',
  currency text not null default 'Bs',
  margin_multiplier numeric not null default 2,
  payment_info text not null default 'Transferencia / Pago móvil: (completa tus datos en Configuración)',
  whatsapp text not null default '',
  delivery_zones text not null default 'Centro, Este, Oeste',
  advance_percent int not null default 50
);
insert into public.settings (id) values (1);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'g',            -- g, ml, unidad
  package_size numeric not null default 1,    -- tamaño del empaque que compra (ej. 1000 g)
  package_price numeric not null default 0,   -- precio del empaque
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text not null default '',
  price numeric not null default 0,           -- precio de venta por unidad/caja
  batch_size int not null default 12,         -- unidades que salen por tanda/receta
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  qty numeric not null default 0              -- cantidad usada POR TANDA, en la unidad del ingrediente
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  delivery_date date not null,
  address text not null,
  zone text not null default '',
  lat double precision,
  lng double precision,
  notes text not null default '',
  status text not null default 'pendiente',   -- pendiente | confirmado | en_produccion | entregado | cancelado
  payment_confirmed boolean not null default false,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  qty int not null,
  unit_price numeric not null
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null default '',
  message text not null,
  status text not null default 'nueva',       -- nueva | atendida
  response text not null default '',
  created_at timestamptz not null default now()
);

-- Seguridad (RLS): las clientas solo pueden ver el catálogo y crear pedidos/reclamos.
-- Tu mamá (usuaria autenticada) puede hacer todo.
alter table public.settings enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.recipe_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.complaints enable row level security;

create policy "public read settings" on public.settings for select using (true);
create policy "public read products" on public.products for select using (true);
create policy "public create orders" on public.orders for insert with check (true);
create policy "public create order items" on public.order_items for insert with check (true);
create policy "public create complaints" on public.complaints for insert with check (true);

create policy "admin all settings" on public.settings for all to authenticated using (true) with check (true);
create policy "admin all ingredients" on public.ingredients for all to authenticated using (true) with check (true);
create policy "admin all products" on public.products for all to authenticated using (true) with check (true);
create policy "admin all recipe_items" on public.recipe_items for all to authenticated using (true) with check (true);
create policy "admin all orders" on public.orders for all to authenticated using (true) with check (true);
create policy "admin all order_items" on public.order_items for all to authenticated using (true) with check (true);
create policy "admin all complaints" on public.complaints for all to authenticated using (true) with check (true);
