alter table public.profiles
  add column people_cared_for smallint not null default 1
  check (people_cared_for between 1 and 5);
