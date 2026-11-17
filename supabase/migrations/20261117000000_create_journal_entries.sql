create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid,
  transcript text not null,
  created_at timestamptz not null default now(),
  constraint journal_entries_transcript_not_blank
    check (char_length(btrim(transcript)) > 0),
  constraint journal_entries_recipient_owner_fk
    foreign key (care_recipient_id, caregiver_id)
    references public.care_recipients (id, caregiver_id)
    on delete set null (care_recipient_id)
);

create index journal_entries_caregiver_created_at_idx
  on public.journal_entries (caregiver_id, created_at desc);

alter table public.journal_entries enable row level security;

revoke all privileges on table public.journal_entries from anon;

revoke all privileges on table public.journal_entries from authenticated;
grant select, insert on table public.journal_entries to authenticated;

create policy "Users can read their own journal entries"
on public.journal_entries
for select
to authenticated
using ((select auth.uid()) = caregiver_id);

create policy "Users can insert their own journal entries"
on public.journal_entries
for insert
to authenticated
with check ((select auth.uid()) = caregiver_id);
