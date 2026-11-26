alter table public.profiles
  add column medication_reminders boolean not null default false,
  add column appointment_reminders boolean not null default false,
  add column wellbeing_checkin_reminders boolean not null default false,
  add column recharge_reminders boolean not null default false,
  add column text_size text not null default 'standard',
  add constraint profiles_text_size_check check (text_size in ('standard', 'large'));
