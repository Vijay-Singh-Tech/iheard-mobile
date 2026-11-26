create table public.care_team_contacts (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null,
  care_recipient_id uuid not null,
  category text not null check (category in (
    'Primary Care Doctor', 'Specialist', 'Mental Health Professional',
    'Pharmacy', 'Other Care Provider'
  )),
  provider_name text check (char_length(btrim(provider_name)) > 0),
  role_specialty text not null check (char_length(btrim(role_specialty)) > 0),
  phone_number text check (char_length(btrim(phone_number)) > 0),
  organization_name text not null check (char_length(btrim(organization_name)) > 0),
  address text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_team_contacts_recipient_owner_fk
    foreign key (care_recipient_id, caregiver_id)
    references public.care_recipients (id, caregiver_id) on delete cascade
);

create index care_team_contacts_owner_recipient_idx
  on public.care_team_contacts (caregiver_id, care_recipient_id);

create trigger care_team_contacts_set_updated_at
before update on public.care_team_contacts
for each row execute function public.set_updated_at();

alter table public.care_team_contacts enable row level security;

revoke all privileges on table public.care_team_contacts from anon, authenticated;
grant select, insert, update, delete on table public.care_team_contacts to authenticated;

create policy "Caregivers manage their own care team contacts"
on public.care_team_contacts
for all
to authenticated
using ((select auth.uid()) = caregiver_id)
with check ((select auth.uid()) = caregiver_id);
