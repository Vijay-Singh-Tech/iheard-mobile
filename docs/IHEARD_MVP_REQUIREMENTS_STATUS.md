# iHEARD MVP — Requirements & Development Status

**Document purpose:** Living source of truth for continued development of the iHEARD MVP.  
**Last updated:** September 30, 2026  
**Recommended repo location:** `/docs/IHEARD_MVP_REQUIREMENTS_STATUS.md`

---

## 1. Product Goal

iHEARD is a caregiver-support application centered on a natural voice conversation.

The MVP should help a caregiver:

1. talk when feeling stressed, overwhelmed, tired, lonely, frustrated, or uncertain;
2. get simple, clinically reviewed caregiving information and coping support;
3. record observations and prepare notes/questions for a healthcare visit;
4. track changes in caregiver wellbeing over time through a simple **Health Matrix**;
5. receive a more personalized experience as iHEARD learns selected information from previous interactions.

The MVP is a **support and wellbeing tool**, not a diagnostic system and not a replacement for emergency or professional medical care.

---

## 2. Current Development Status

### Mobile app

Current project direction:

- React Native / Expo mobile application.
- Authentication is working.
- Login has been tested successfully.
- A caregiver can reach the **Add Care Recipient** flow.
- A care recipient has previously been added during testing.
- The app is currently on the `main` branch in the last known clean development checkpoint.

### Current known issue

After signing out and signing back in:

- login succeeds;
- the app returns to **Add Care Recipient**;
- the care recipient created earlier is not being shown.

**Immediate development priority:** determine whether the issue is:
- recipient data not being persisted correctly;
- recipient data exists but is not being fetched after login;
- authentication/user ID is not correctly linked to the recipient record; or
- navigation logic is always routing to Add Care Recipient.

Expected behavior:

```text
User logs in
   ↓
Load caregiver profile
   ↓
Check for existing care recipient
   ├── Existing recipient → Home / main caregiver experience
   └── No recipient       → Add Care Recipient
```

### App icon

The iHEARD home-screen icon can be replaced with the final iHEARD artwork. This is not an MVP blocker and should be handled after the core user flow is stable.

---

## 3. MVP Scope

### Must-have

The first MVP should include:

- caregiver account and authentication;
- caregiver profile;
- care recipient profile;
- persistent caregiver-to-recipient relationship;
- tap-to-talk voice interaction;
- speech transcription;
- natural supportive conversation;
- onboarding **iHEARD Caregiver Wellbeing Check (MVP)**;
- simple caregiver Health Matrix;
- conversation summaries / selected caregiver memory;
- journaling and doctor-visit preparation;
- practical caregiving information from an approved knowledge source;
- simple personalized coping/support suggestions;
- safety detection and escalation flow;
- history/trend view;
- basic product and pilot analytics.

### Not required for the first MVP

These should remain later-phase items unless needed for the pilot:

- Siri-style or always-listening wake word;
- a custom iHEARD wearable;
- full clinician dashboard;
- full family/caregiver network portal;
- EHR integration;
- automatic family contact without explicit consent;
- custom foundation model;
- knowledge distillation;
- advanced autoencoder pipeline;
- clinically validated diagnostic claims from voice;
- permanent storage of raw audio.

---

## 4. Core User Journeys

### 4.1 Emotional support

```text
Caregiver opens iHEARD
→ taps microphone
→ speaks naturally
→ iHEARD identifies that the caregiver wants to vent/support
→ responds empathetically
→ may offer one short coping action
→ records selected summary/check-in information
→ updates relevant Health Matrix area
```

The system should first understand whether the caregiver wants:
- someone to listen;
- a coping suggestion;
- information; or
- connection to additional support.

It should not immediately overload the caregiver with advice.

---

### 4.2 Caregiving guidance

```text
Caregiver asks a question
→ speech is transcribed
→ system retrieves relevant approved content
→ AI forms a short, understandable answer
→ source/category is recorded
```

For the MVP, begin with a defined care domain, such as dementia caregiving, rather than trying to support every condition.

Clinical/educational content should come from reviewed sources. The language model should explain the content; it should not invent clinical guidance.

---

### 4.3 Journal / doctor preparation

The caregiver can describe:

- patient changes;
- symptoms or behavior noticed;
- medication-related observations;
- sleep or routine changes;
- important caregiving events;
- questions to ask at the next healthcare visit.

iHEARD should create a short structured summary that can later be reviewed by the caregiver.

---

## 5. Proposed Technical Architecture

```text
                     iHEARD Mobile App
                    React Native / Expo
                           │
              ┌────────────┼────────────┐
              │            │            │
             Auth        Voice        UI/forms
              │            │
              ▼            ▼
                    Backend / APIs
                       FastAPI
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      Supabase         AI / Voice       Safety rules
   Postgres + Auth     services          & workflows
          │                │
          │        ┌───────┴────────┐
          │        │                │
          ▼        ▼                ▼
     Caregiver   Whisper /      Voice-analysis
     memory      transcription      pipeline
     Health Matrix                  │
     recipient data          eGeMAPS / WavLM
     approved content
```

### Current preferred technology stack

| Area | Tool / framework |
|---|---|
| Mobile app | React Native + Expo |
| Authentication | Supabase Auth |
| Main database | Supabase Postgres |
| Data permissions | Supabase Row Level Security (RLS) |
| Backend/API | Python + FastAPI |
| Natural voice/conversation | OpenAI voice / Realtime capabilities |
| Transcription | Whisper |
| Audio processing/research | Librosa |
| Interpretable speech features | openSMILE / eGeMAPS |
| Deep speech representation | WavLM / wav2vec family |
| ML experiments | PyTorch + scikit-learn |
| Semantic retrieval | pgvector where appropriate |
| Apple health data | Apple HealthKit |
| Product analytics | PostHog + Supabase pilot metrics |
| Model versioning later | MLflow or equivalent |

**Note:** openSMILE licensing must be reviewed before commercial production use.

---

## 6. Voice and Audio Requirements

### MVP interaction

Use **tap-to-talk**.

A wake word or Siri-style activation is not required for the MVP.

### Voice processing

The same spoken response may be used for two separate purposes:

```text
                     Caregiver voice
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        WHAT WAS SAID              HOW IT WAS SAID
              │                         │
           Whisper             Acoustic / ML analysis
              │                         │
         Transcript            eGeMAPS + WavLM
              │                         │
              └────────────┬────────────┘
                           ▼
                   iHEARD interpretation
```

These streams must stay conceptually separate.

### Transcript stream

Used for:

- understanding the caregiver's request;
- journal/doctor notes;
- conversation summary;
- retrieval of appropriate support/education;
- safety checks.

### Voice-signal stream

Research targets initially include:

- stress / overwhelm;
- exhaustion;
- anxiety;
- sadness / loneliness;
- frustration;
- caregiver burden;
- positive changes such as improved coping.

Possible inputs:

- pitch;
- pitch variation;
- loudness;
- speaking rate;
- pauses;
- jitter/shimmer;
- voice quality;
- eGeMAPS features;
- learned WavLM embeddings.

### Caregiver-specific baseline

The intended iHEARD approach is not simply:

> compare one caregiver with an average person.

The preferred approach is:

> compare the caregiver's current voice/check-in with **their own established baseline and recent history**.

This reduces the risk of treating someone's natural speaking style as a sign of distress.

### MVP limitation

Voice biomarkers should initially be treated as **experimental supportive signals**, not medical diagnoses.

Until validated, explicit self-report/check-in answers must remain the primary source for wellbeing scoring.

---

## 7. Audio Storage Policy

Default behavior:

```text
record voice
→ temporarily process
→ transcribe
→ extract required features
→ delete raw audio
```

Persist only what is needed, such as:

- transcript when appropriate;
- short conversation summary;
- wellbeing/check-in values;
- relevant extracted features/scores;
- journal entry;
- user-approved memory.

Raw voice should **not be permanently stored by default**.

If future research requires audio retention, it must use separate informed consent and a defined retention/deletion policy.

---

## 8. Caregiver Memory

iHEARD should not literally remember everything.

For the MVP, store selected structured information that improves the experience.

### Information that may be remembered

- stress/check-in history;
- coping methods suggested;
- whether a coping method helped;
- recurring caregiver concerns;
- preferences;
- important caregiving events;
- journal entries;
- doctor-preparation notes;
- approved conversation summaries;
- relevant care-recipient context.

### Suggested technical design

Use structured Postgres tables for important facts and time-series records.

Use semantic retrieval/pgvector only where useful for recalling relevant summaries or approved content.

Do not rely on an LLM's conversation context as the database.

### User control

The data model should be designed so information can later be:

- viewed;
- corrected;
- deleted;
- excluded from future personalization.

---

## 9. Health Matrix

The first Health Matrix should be deliberately simple.

Initial areas:

- stress;
- sleep;
- physical activity / fatigue;
- coping;
- emotional wellbeing;
- caregiver burden;
- support / feeling in control;
- relevant patient-care complexity/context.

### Initial scoring

For the MVP, use understandable categories such as:

- Low
- Moderate
- High

or another small, clinically approved scale.

Do not hard-code clinical thresholds in the mobile application.

Store scoring rules in versioned backend tables/configuration so Dana/clinical reviewers can approve or change them without rebuilding the app.

### Recommendations

The Health Matrix should normally produce only **one or two useful next actions**, rather than a large list.

Example:

```text
High stress + poor sleep
→ acknowledge caregiver
→ suggest one short coping/rest action
→ ask whether it helped later
```

---

## 10. iHEARD Caregiver Wellbeing Check (MVP)

For the MVP, iHEARD will use a short custom onboarding questionnaire called the **iHEARD Caregiver Wellbeing Check**.

This is an **MVP product assessment**, not a validated psychometric or diagnostic test. Its purpose is to:

- create an initial caregiver wellbeing baseline;
- personalize the first iHEARD experience;
- populate the Health Matrix;
- identify which area may need the most support;
- provide a repeatable measure for tracking change during the MVP.

### Question format

Prompt:

> Thinking about the past 7 days, how much has each of the following been true for you?

Answer scale:

- 0 — Not at all
- 1 — A little
- 2 — Quite a bit
- 3 — A lot

Initial MVP questions:

1. I have felt overwhelmed by my caregiving responsibilities.
2. I have had difficulty getting enough rest or sleep.
3. I have felt physically tired or worn out because of caregiving.
4. I have felt emotionally drained by caregiving.
5. I have felt that my caregiving responsibilities were difficult to manage.
6. I have felt alone or unsupported in my caregiving role.
7. Caregiving has made it difficult to take care of my own needs.

### MVP scoring

Total score range: **0–21**.

For the MVP only:

- **0–6:** Lower current strain
- **7–13:** Moderate current strain
- **14–21:** Higher current strain

These labels are internal product categories and must **not** be presented as a clinical diagnosis.

The individual answers should also map to the Health Matrix:

| Question | Health Matrix area |
|---|---|
| Overwhelmed | Stress |
| Rest/sleep | Sleep |
| Physical tiredness | Fatigue / activity |
| Emotionally drained | Emotional wellbeing |
| Difficult to manage | Coping / control |
| Alone / unsupported | Social support |
| Own needs affected | Caregiver burden / self-care |

### Safety question

Safety should be handled separately from the score.

Example:

> Do you feel that you or the person you care for may be in immediate danger, or are you having thoughts of harming yourself or someone else?

A positive answer should bypass normal scoring and trigger the approved iHEARD safety workflow.

### Repeat use

The same assessment can be repeated:

- during onboarding to create a baseline;
- periodically during the pilot, such as weekly;
- when the caregiver chooses to complete a check-in.

Trend comparisons should primarily compare the caregiver with **their own previous scores**.

### Technical implementation

Store the questionnaire definition and scoring rules in the backend so the questions can later be changed without rebuilding the mobile app.

Suggested records:

- assessment version;
- question ID;
- response value;
- total score;
- Health Matrix dimension values;
- completion date/time.

Suggested implementation:

- React Native / Expo for the onboarding screens;
- Supabase Postgres for questions, responses, and results;
- FastAPI or backend logic for scoring and recommendation rules;
- versioned scoring configuration rather than hard-coded clinical logic in the app.

ChatGPT/Codex can be used to build the questionnaire UI, database schema, scoring code, tests, and Health Matrix integration. Clinical reviewers should review the wording and scoring before any external pilot.

### Future validation

Validated measures such as PHQ-9, GAD-7, Zarit caregiver burden measures, or WHO-5 may later be added or used to validate/replace parts of this MVP assessment, subject to clinical review and any applicable licensing/usage requirements.

---

## 11. Support Recommendation Logic

Support should match the caregiver's need.

Possible categories:

| Need | Example response |
|---|---|
| Venting / overwhelm | empathetic listening |
| Anxiety | short grounding/breathing exercise |
| Burnout / fatigue | practical coping or rest suggestion |
| Caregiving uncertainty | approved educational content |
| Doctor preparation | structured observation/question summary |
| Isolation | suggest available support |
| Safety risk | fixed safety workflow |

The AI can personalize the wording, but core clinical/safety rules should not depend only on generative AI.

---

## 12. Safety and Escalation

Safety behavior must be deterministic enough to test.

Recommended initial levels:

### Level 1 — Concern

Examples may include:

- severe distress;
- escalating caregiver burden;
- concerning language without immediate danger.

Possible action:

- supportive acknowledgement;
- safety clarification question;
- recommend trusted person or healthcare professional;
- display appropriate reviewed resources.

### Level 2 — Emergency

Potential immediate harm or emergency indicators.

Action:

1. stop the normal conversational flow;
2. display clear emergency guidance;
3. show verified crisis/emergency resources;
4. provide appropriate phone/deep-link actions.

### Technical approach

Use more than one safety layer:

```text
structured rules / key indicators
            +
AI classification/context check
            +
fixed severity workflow
```

Do not allow the generative model to freely decide the emergency workflow.

All thresholds, wording, and resource lists require clinical/legal review before real-world deployment.

---

## 13. Family / Trusted Person Contact

Contacting another person requires explicit, revocable consent.

For the MVP:

- do not automatically contact family;
- record whether permission has been granted;
- define exactly who may be contacted and under what conditions.

Emergency exceptions, if any, must be explicitly defined in the approved safety policy.

---

## 14. Apple Health / Wearable Data

The first integration should use **Apple HealthKit**, not a custom iHEARD wearable.

Potential signals:

- steps / activity;
- resting heart rate;
- HRV;
- sleep, when available.

The application must continue to work when:

- the caregiver does not own an Apple Watch;
- HealthKit permission is denied;
- some health signals are unavailable.

Wearable data should enrich the Health Matrix, not become a dependency for the core app.

---

## 15. Caregiver and Care Recipient Data Model

Minimum logical entities:

```text
auth_user
   │
   ▼
caregiver_profile
   │
   ├───────────────┐
   ▼               ▼
care_recipient   consent
   │
   ├── journal_entries
   ├── observations
   └── doctor_notes

caregiver_profile
   │
   ├── conversations
   ├── conversation_summaries
   ├── wellbeing_checkins
   ├── health_matrix_scores
   ├── coping_actions
   ├── caregiver_memory
   ├── safety_events
   └── wearable_metrics
```

Every user-owned record must be protected by Supabase RLS.

A care recipient must be explicitly associated with the authenticated caregiver/user.

This relationship is the first area to verify while fixing the current persistence/navigation bug.

---

## 16. Approved Knowledge / Clinical Content

Clinical education should be separated from general LLM knowledge.

Recommended pattern:

```text
Caregiver question
      ↓
Retrieve reviewed iHEARD content
      ↓
Generate simple answer grounded in that content
      ↓
Safety/clinical constraints
      ↓
Caregiver
```

Use Supabase/Postgres + pgvector or an equivalent retrieval layer.

Each approved content item should eventually include:

- condition/topic;
- source;
- review status;
- reviewer;
- review/version date;
- content version.

Start with a narrow condition/topic set for the MVP.

---

## 17. Privacy and Security

Required baseline:

- Supabase RLS for user-owned data;
- encrypted transport;
- least-privilege service access;
- separate development/test and production environments;
- synthetic/demo data for POC demonstrations;
- no EHR integration in the initial MVP;
- no permanent raw audio by default;
- defined retention/deletion rules;
- consent records for optional data uses;
- auditability for clinical/scoring rule changes.

Do not present the POC as HIPAA-compliant unless the complete deployment, contracts, infrastructure, logging, processes, and policies have actually been reviewed for that purpose.

---

## 18. POC / Demo Data

Use synthetic/demo caregiver and care-recipient data for development and demonstrations.

Do not use real caregiver health records until the appropriate consent, security, research/clinical, and legal process has been established.

Maintain a separate development/test Supabase environment.

---

## 19. Analytics and Pilot Success

Track only the data needed to understand whether the MVP is useful.

Possible pilot measures:

- onboarding completion;
- return usage;
- number of meaningful voice conversations;
- check-in completion;
- helpful/not-helpful response;
- coping action offered;
- coping action follow-up;
- retention;
- satisfaction;
- safety events;
- change in selected wellbeing/burden measures.

Use PostHog for product events where appropriate and Supabase for outcome data.

Avoid putting sensitive transcript/health content directly into generic analytics events.

---

## 20. Proprietary iHEARD Technology

Long-term proprietary value should focus on **caregiver intelligence**, not rebuilding commodity infrastructure.

Potential proprietary components:

1. caregiver-specific longitudinal voice baseline;
2. caregiver voice/wellbeing biomarker model;
3. Health Matrix and scoring methodology;
4. caregiver history / state representation;
5. support-matching logic;
6. longitudinal caregiver dataset and validated outcome relationships.

Third-party technology can initially handle:

- authentication infrastructure;
- general-purpose LLM capability;
- transcription;
- pretrained speech models;
- commodity analytics.

---

## 21. Research / Later Voice Architecture

After enough properly consented and labeled data exists:

```text
Audio
  │
  ├─► Whisper ─► linguistic/content features
  │
  ├─► eGeMAPS ─► interpretable acoustic features
  │
  └─► WavLM ───► learned speech embeddings
                    │
                    ▼
                feature fusion
                    │
                    ▼
             trained mapping model
                    │
                    ▼
        caregiver state / change estimate
                    │
                    ▼
        compare with personal baseline
```

Possible future work:

- autoencoders / dimensionality reduction;
- multimodal modeling;
- knowledge distillation;
- smaller on-device models;
- formal validation studies;
- model monitoring and MLflow/model registry.

These are **not current MVP blockers**.

---

## 22. Development Priorities

### Priority 0 — Fix current user/recipient persistence flow

1. inspect Supabase tables and auth linkage;
2. confirm existing care recipient record is saved;
3. confirm `user_id` / caregiver ownership field is correct;
4. fetch recipient after authentication;
5. route existing users to the correct main screen;
6. test sign out → sign in → recipient persists.

**Acceptance test**

```text
Create account
→ create care recipient
→ close/sign out
→ sign back in
→ same recipient appears
→ user is not asked to add the recipient again
```

---

### Priority 1 — Establish stable app shell

Complete:

- authentication;
- caregiver profile;
- care recipient profile;
- persistent session;
- main/home screen;
- navigation;
- sign out;
- loading/error states.

---

### Priority 2 — Tap-to-talk conversation

Build:

- microphone permission;
- tap to record;
- stop recording;
- send audio;
- transcription;
- AI response;
- spoken or streamed response;
- conversation display;
- error/retry states.

At this point, do not require the advanced biomarker model.

---

### Priority 3 — iHEARD Caregiver Wellbeing Check

Build:

- the seven-question MVP assessment;
- 0–3 answer scale;
- versioned questionnaire definition;
- response and result storage in Supabase;
- MVP score calculation;
- Health Matrix dimension mapping;
- separate safety question and safety routing;
- save the onboarding result as the caregiver's baseline;
- show one simple support suggestion based on the strongest area of need.

---

### Priority 4 — Health Matrix V1

Build database and simple UI for:

- stress;
- sleep;
- activity/fatigue;
- coping;
- burden/wellbeing.

Use versioned backend scoring rules.

---

### Priority 5 — Memory / personalization

Persist:

- selected conversation summary;
- recurring concerns;
- coping methods;
- check-in history;
- important journal/doctor notes.

Retrieve only relevant prior information during a conversation.

---

### Priority 6 — Three core conversation modes

Support:

1. emotional support;
2. caregiving information;
3. journal / doctor preparation.

The caregiver should not need to manually select a mode if intent can be identified reliably, but explicit UI shortcuts may also be provided.

---

### Priority 7 — Safety workflow

Implement and test:

- concern detection;
- emergency detection;
- fixed safety screen/flow;
- verified resource list;
- logging of safety event;
- consent-dependent trusted-person option.

---

### Priority 8 — Voice biomarker research service

Create a separate Python/FastAPI service.

Initial pipeline:

- audio normalization/preprocessing;
- eGeMAPS/openSMILE extraction;
- WavLM embeddings;
- optional Librosa features;
- feature/result storage;
- simple experimental scikit-learn/PyTorch models.

Do not allow experimental scores to become clinical decisions without validation.

---

### Priority 9 — Apple HealthKit

After the core MVP works:

- permission flow;
- steps/activity;
- resting heart rate;
- HRV;
- sleep when available;
- Health Matrix enrichment.

---

### Priority 10 — Pilot instrumentation

Add:

- de-identified product events;
- outcome/check-in tables;
- simple pilot reporting/dashboard.

---

## 23. Definition of Done — First Demonstrable MVP

The first demonstrable MVP is complete when a new user can:

1. create an account and sign in;
2. create a caregiver/care-recipient profile;
3. sign out and later sign back in without losing the recipient;
4. complete the iHEARD Caregiver Wellbeing Check and establish a baseline;
5. tap the microphone and have a natural voice conversation;
6. receive a transcript/AI response;
7. use iHEARD for emotional support;
8. ask a supported caregiving question and receive an approved-content-grounded answer;
9. create a journal/doctor-preparation note;
10. receive one appropriate coping/support suggestion;
11. see a simple Health Matrix;
12. return later and have selected prior context remembered;
13. trigger the tested safety workflow when appropriate;
14. use the app without raw voice being permanently stored by default.

The demo should prove the **caregiver experience**, not every future AI capability.

---

## 24. Open Decisions Requiring Product / Clinical Approval

The following should remain explicit open items rather than being guessed in code:

- final review/approval of the iHEARD Caregiver Wellbeing Check wording and MVP score bands;
- frequency of repeat wellbeing checks during the pilot;
- which validated assessment tools will later be used for validation or replacement and under what license/permission;
- final Health Matrix dimensions;
- final scoring thresholds;
- definition of “caregiver burden” used by iHEARD;
- exact safety concern/emergency thresholds;
- approved safety language;
- approved crisis/support resources;
- rules for trusted-person contact;
- exact approved clinical content set for the first condition;
- retention period for transcripts/summaries;
- whether any audio may be retained for research and under what consent;
- pilot population and success thresholds;
- clinical validation plan for voice biomarkers.

---

## 25. Engineering Principles

While developing the MVP:

1. **Build the caregiver flow first.** Do not block the product on advanced ML research.
2. **Keep clinical rules configurable.** Do not bury thresholds in mobile code.
3. **Keep raw audio temporary by default.**
4. **Separate facts/data from LLM output.**
5. **Use approved content for caregiving guidance.**
6. **Treat voice biomarkers as experimental until validated.**
7. **Compare longitudinally with the caregiver's own baseline.**
8. **Keep safety workflows deterministic and testable.**
9. **Design every record around authenticated ownership and RLS.**
10. **Prefer a simple working MVP over unnecessary model complexity.**

---

## 26. Next Engineering Task

**Resume development with the care-recipient persistence/navigation defect.**

Start by verifying:

1. where `AddCareRecipientScreen.tsx` writes the recipient;
2. the Supabase table and column used for caregiver ownership;
3. the authenticated user's ID at insert time;
4. the query executed after login;
5. the condition that decides between:
   - Add Care Recipient; and
   - the existing-recipient/home flow.

Once that is fixed and tested, proceed to the **tap-to-talk voice conversation** feature.

---

## 27. Status Summary

| Area | Status |
|---|---|
| React Native / Expo project | In progress |
| Authentication | Working in current testing |
| Sign out / sign in | Working |
| Care recipient creation | Implemented/tested at least once |
| Care recipient persistence after re-login | **Current issue / next task** |
| Main caregiver home flow | Needs continuation |
| Tap-to-talk voice | Planned next |
| Transcription | Planned |
| Natural voice AI | Planned |
| Wellbeing onboarding | Planned |
| Health Matrix | Requirements defined; implementation pending |
| Caregiver memory | Requirements defined; implementation pending |
| Safety workflow | Requirements defined; implementation pending |
| Approved-content retrieval | Architecture defined; implementation pending |
| Voice biomarker research | Technical direction defined; experimental |
| HealthKit | Later MVP phase |
| Pilot analytics | Later MVP phase |
| App icon | Can be updated later; not a blocker |

---

**This document should be updated whenever a major product, clinical, architecture, privacy, or development decision changes.**
