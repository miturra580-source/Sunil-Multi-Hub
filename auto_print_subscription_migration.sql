-- Applied to Supabase on 2026-08-25.
-- Auto Print access: 3-day trial, then ₹149 for each approved 30-day renewal.
-- The live migration also includes RLS policies and the two RPC functions below.

create table if not exists public.auto_print_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '3 days'),
  paid_until timestamptz,
  plan_amount numeric(10,2) not null default 149 check (plan_amount = 149),
  status text not null default 'trial' check (status in ('trial','active','expired','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auto_print_subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null default 149 check (amount = 149),
  payment_ref text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
