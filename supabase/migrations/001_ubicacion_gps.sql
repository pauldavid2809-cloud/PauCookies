-- Migración: ubicación GPS en los pedidos
-- Pega esto en Supabase -> SQL Editor -> Run (solo una vez)

alter table public.orders
  add column if not exists lat double precision,
  add column if not exists lng double precision;
