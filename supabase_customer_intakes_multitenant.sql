-- SUNIL MULTI HUB: multi-tenant CSC customer self-form schema
create table if not exists public.customer_intakes (
 id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id) on delete cascade,
 application_no text not null unique, service_name text not null, full_name text not null,
 father_or_husband_name text, mother_name text, dob date, gender text, mobile text not null,
 email text, aadhaar text, pan text, address text, village_city text, post_police text, district text,
 state text, pincode text, notes text, consent boolean not null default false,
 source text not null default 'public_self_form', status text not null default 'new' check(status in ('new','processing','completed','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.customer_intakes add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.customer_intakes enable row level security;
drop policy if exists "public can submit customer intake" on public.customer_intakes;
create policy "public can submit customer intake" on public.customer_intakes for insert to anon,authenticated with check(owner_id is not null and consent=true and char_length(full_name) between 2 and 120 and mobile ~ '^[6-9][0-9]{9}$');
drop policy if exists "owners can read own customer intakes" on public.customer_intakes;
create policy "owners can read own customer intakes" on public.customer_intakes for select to authenticated using(owner_id=auth.uid() or public.is_admin());
drop policy if exists "owners can update own customer intakes" on public.customer_intakes;
create policy "owners can update own customer intakes" on public.customer_intakes for update to authenticated using(owner_id=auth.uid() or public.is_admin()) with check(owner_id=auth.uid() or public.is_admin());
revoke all on public.customer_intakes from anon; grant insert on public.customer_intakes to anon; grant select,insert,update on public.customer_intakes to authenticated;
create or replace function public.get_public_csc_center(p_center_id uuid) returns table(center_name text,full_name text) language sql security definer set search_path=public as $$ select coalesce(p.full_name,'CSC Centre')::text,p.full_name::text from public.profiles p where p.id=p_center_id limit 1 $$;
revoke all on function public.get_public_csc_center(uuid) from public; grant execute on function public.get_public_csc_center(uuid) to anon,authenticated;
create or replace view public.customer_intakes_admin_view with (security_invoker=true) as select ci.*,p.full_name owner_name,p.email owner_email from public.customer_intakes ci left join public.profiles p on p.id=ci.owner_id;
grant select on public.customer_intakes_admin_view to authenticated;
create index if not exists customer_intakes_owner_created_idx on public.customer_intakes(owner_id,created_at desc);