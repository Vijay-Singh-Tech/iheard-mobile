create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  preferred_name text not null,
  relationship text not null,
  primary_condition text not null,
  other_conditions text[] not null default '{}',
  care_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index care_recipients_caregiver_id_idx
  on public.care_recipients (caregiver_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger care_recipients_set_updated_at
before update on public.care_recipients
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.care_recipients enable row level security;

revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.care_recipients from anon;

revoke all privileges on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;

revoke all privileges on table public.care_recipients from authenticated;
grant select, insert, update, delete on table public.care_recipients to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own care recipients"
on public.care_recipients
for select
to authenticated
using ((select auth.uid()) = caregiver_id);

create policy "Users can insert their own care recipients"
on public.care_recipients
for insert
to authenticated
with check ((select auth.uid()) = caregiver_id);

create policy "Users can update their own care recipients"
on public.care_recipients
for update
to authenticated
using ((select auth.uid()) = caregiver_id)
with check ((select auth.uid()) = caregiver_id);

create policy "Users can delete their own care recipients"
on public.care_recipients
for delete
to authenticated
using ((select auth.uid()) = caregiver_id);
