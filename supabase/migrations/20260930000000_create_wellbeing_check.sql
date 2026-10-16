create table public.wellbeing_assessment_versions (
  version text primary key,
  title text not null,
  prompt text not null,
  questions jsonb not null,
  answer_options jsonb not null,
  score_bands jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint wellbeing_assessment_questions_are_array
    check (jsonb_typeof(questions) = 'array'),
  constraint wellbeing_assessment_answer_options_are_array
    check (jsonb_typeof(answer_options) = 'array'),
  constraint wellbeing_assessment_score_bands_are_array
    check (jsonb_typeof(score_bands) = 'array')
);

insert into public.wellbeing_assessment_versions (
  version,
  title,
  prompt,
  questions,
  answer_options,
  score_bands,
  is_active
)
values (
  'v1',
  'iHEARD Caregiver Wellbeing Check',
  'Thinking about the past 7 days, how much has each of the following been true for you?',
  '[
    {"id":"q1","order":1,"text":"I have felt overwhelmed by my caregiving responsibilities.","dimensionKey":"stress","dimensionLabel":"Stress"},
    {"id":"q2","order":2,"text":"I have had difficulty getting enough rest or sleep.","dimensionKey":"sleep","dimensionLabel":"Sleep"},
    {"id":"q3","order":3,"text":"I have felt physically tired or worn out because of caregiving.","dimensionKey":"fatigue","dimensionLabel":"Fatigue"},
    {"id":"q4","order":4,"text":"I have felt emotionally drained by caregiving.","dimensionKey":"emotional_wellbeing","dimensionLabel":"Emotional wellbeing"},
    {"id":"q5","order":5,"text":"I have felt that my caregiving responsibilities were difficult to manage.","dimensionKey":"coping_control","dimensionLabel":"Coping / control"},
    {"id":"q6","order":6,"text":"I have felt alone or unsupported in my caregiving role.","dimensionKey":"social_support","dimensionLabel":"Social support"},
    {"id":"q7","order":7,"text":"Caregiving has made it difficult to take care of my own needs.","dimensionKey":"caregiver_burden_self_care","dimensionLabel":"Caregiver burden / self-care"}
  ]'::jsonb,
  '[
    {"value":0,"label":"Not at all"},
    {"value":1,"label":"A little"},
    {"value":2,"label":"Quite a bit"},
    {"value":3,"label":"A lot"}
  ]'::jsonb,
  '[
    {"min":0,"max":6,"category":"Lower current strain","explanation":"Your answers suggest lower current caregiving strain in this MVP check.","nextStep":"Continue checking in and make time for one activity that supports your wellbeing."},
    {"min":7,"max":13,"category":"Moderate current strain","explanation":"Your answers suggest some current caregiving strain in this MVP check.","nextStep":"Choose one small support or rest action that feels manageable today."},
    {"min":14,"max":21,"category":"Higher current strain","explanation":"Your answers suggest higher current caregiving strain in this MVP check.","nextStep":"Consider reaching out to someone you trust or a healthcare professional for additional support."}
  ]'::jsonb,
  true
);

alter table public.care_recipients
add constraint care_recipients_id_caregiver_id_key
unique (id, caregiver_id);

create table public.wellbeing_checkins (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid not null,
  assessment_version text not null references public.wellbeing_assessment_versions (version),
  responses jsonb not null,
  total_score smallint not null,
  mvp_category text not null,
  health_matrix_values jsonb not null,
  completed_at timestamptz not null default now(),
  constraint wellbeing_checkins_recipient_owner_fk
    foreign key (care_recipient_id, caregiver_id)
    references public.care_recipients (id, caregiver_id)
    on delete cascade,
  constraint wellbeing_checkins_responses_are_object
    check (jsonb_typeof(responses) = 'object'),
  constraint wellbeing_checkins_health_matrix_values_are_object
    check (jsonb_typeof(health_matrix_values) = 'object'),
  constraint wellbeing_checkins_total_score_nonnegative
    check (total_score >= 0)
);

create index wellbeing_checkins_caregiver_id_idx
  on public.wellbeing_checkins (caregiver_id);

create index wellbeing_checkins_care_recipient_id_idx
  on public.wellbeing_checkins (care_recipient_id);

alter table public.wellbeing_assessment_versions enable row level security;
alter table public.wellbeing_checkins enable row level security;

revoke all privileges on table public.wellbeing_assessment_versions from anon;
revoke all privileges on table public.wellbeing_checkins from anon;

revoke all privileges on table public.wellbeing_assessment_versions from authenticated;
grant select on table public.wellbeing_assessment_versions to authenticated;

revoke all privileges on table public.wellbeing_checkins from authenticated;
grant select, insert on table public.wellbeing_checkins to authenticated;

create policy "Authenticated users can read wellbeing assessment versions"
on public.wellbeing_assessment_versions
for select
to authenticated
using (true);

create policy "Users can read their own wellbeing checkins"
on public.wellbeing_checkins
for select
to authenticated
using ((select auth.uid()) = caregiver_id);

create policy "Users can insert their own wellbeing checkins"
on public.wellbeing_checkins
for insert
to authenticated
with check (
  (select auth.uid()) = caregiver_id
  and exists (
    select 1
    from public.care_recipients
    where care_recipients.id = care_recipient_id
      and care_recipients.caregiver_id = (select auth.uid())
  )
);
