create table public.support_contacts (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  relationship text not null check (char_length(btrim(relationship)) > 0),
  categories text[] not null check (
    cardinality(categories) between 1 and 5
    and array_position(categories, null) is null
    and categories <@ array[
      'Family & Friends', 'Support Groups', 'Practical Help',
      'Emotional Support', 'Community Organizations'
    ]
  ),
  phone_number text,
  email text,
  location text,
  how_can_they_help text,
  notes text,
  availability text check (availability in (
    'Weekdays', 'Weekends', 'Anytime', 'Emergencies', 'Other'
  )),
  supports_caregiver boolean not null default true,
  is_go_to boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, caregiver_id)
);

create table public.support_contact_recipients (
  support_contact_id uuid not null,
  care_recipient_id uuid not null,
  caregiver_id uuid not null,
  primary key (support_contact_id, care_recipient_id),
  foreign key (support_contact_id, caregiver_id)
    references public.support_contacts (id, caregiver_id) on delete cascade,
  foreign key (care_recipient_id, caregiver_id)
    references public.care_recipients (id, caregiver_id) on delete cascade
);

create index support_contacts_owner_order_idx
  on public.support_contacts (caregiver_id, is_go_to desc, created_at);
create index support_contact_recipients_recipient_idx
  on public.support_contact_recipients (care_recipient_id, caregiver_id);

create trigger support_contacts_set_updated_at
before update on public.support_contacts
for each row execute function public.set_updated_at();

alter table public.support_contacts enable row level security;
alter table public.support_contact_recipients enable row level security;

revoke all privileges on public.support_contacts, public.support_contact_recipients from anon, authenticated;
grant select, insert, update, delete on public.support_contacts to authenticated;
grant select, insert, delete on public.support_contact_recipients to authenticated;

create policy "Caregivers manage their own support contacts"
on public.support_contacts for all to authenticated
using ((select auth.uid()) = caregiver_id)
with check ((select auth.uid()) = caregiver_id);

create policy "Caregivers manage their own support contact links"
on public.support_contact_recipients for all to authenticated
using ((select auth.uid()) = caregiver_id)
with check ((select auth.uid()) = caregiver_id);

create function public.save_support_contact(
  p_contact_id uuid,
  p_name text,
  p_relationship text,
  p_categories text[],
  p_phone_number text,
  p_email text,
  p_location text,
  p_how_can_they_help text,
  p_notes text,
  p_availability text,
  p_supports_caregiver boolean,
  p_is_go_to boolean,
  p_recipient_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_supports_caregiver is not true and coalesce(cardinality(p_recipient_ids), 0) = 0 then
    raise exception 'Select who this contact supports.' using errcode = '22023';
  end if;

  if p_contact_id is null then
    insert into public.support_contacts (
      caregiver_id, name, relationship, categories, phone_number, email,
      location, how_can_they_help, notes, availability, supports_caregiver, is_go_to
    ) values (
      owner_id, btrim(p_name), btrim(p_relationship), p_categories, p_phone_number, p_email,
      p_location, p_how_can_they_help, p_notes, p_availability, p_supports_caregiver, p_is_go_to
    ) returning id into saved_id;
  else
    update public.support_contacts set
      name = btrim(p_name),
      relationship = btrim(p_relationship),
      categories = p_categories,
      phone_number = p_phone_number,
      email = p_email,
      location = p_location,
      how_can_they_help = p_how_can_they_help,
      notes = p_notes,
      availability = p_availability,
      supports_caregiver = p_supports_caregiver,
      is_go_to = p_is_go_to
    where id = p_contact_id and caregiver_id = owner_id
    returning id into saved_id;

    if saved_id is null then
      raise exception 'Support contact unavailable.' using errcode = '42501';
    end if;

    delete from public.support_contact_recipients
    where support_contact_id = saved_id and caregiver_id = owner_id;
  end if;

  insert into public.support_contact_recipients (support_contact_id, care_recipient_id, caregiver_id)
  select distinct saved_id, recipient_id, owner_id
  from unnest(p_recipient_ids) as recipients(recipient_id);

  return saved_id;
end
$$;

revoke all on function public.save_support_contact(uuid, text, text, text[], text, text, text, text, text, text, boolean, boolean, uuid[])
  from public, anon, authenticated;
grant execute on function public.save_support_contact(uuid, text, text, text[], text, text, text, text, text, text, boolean, boolean, uuid[])
  to authenticated;
