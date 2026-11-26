alter table public.care_recipients
  add column age_years smallint
    check (age_years between 0 and 130),
  add column primary_condition_duration text
    check (primary_condition_duration in (
      'Less than 6 months', '6–12 months', '1–3 years',
      '3–5 years', 'More than 5 years', 'Not sure'
    )),
  add column current_status text
    check (current_status in ('Improving', 'Stable', 'Worsening', 'Not sure'));
