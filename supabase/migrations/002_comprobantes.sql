-- Migración: comprobante de pago obligatorio en los pedidos
-- Pega esto en Supabase -> SQL Editor -> Run (solo una vez)

alter table public.orders
  add column if not exists receipt_url text not null default '';

-- Bucket público donde se guardan las capturas de los comprobantes
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

-- Las clientas (anónimas) pueden subir su comprobante; nadie puede borrar ni reemplazar
create policy "subir comprobantes"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'comprobantes');
