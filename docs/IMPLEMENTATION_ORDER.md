# Implementation Order

Astra should execute in this order unless a technical dependency requires a small local deviation.

## Phase 0 — Repository and specification intake

- read every specification document,
- create implementation plan,
- identify contradictions,
- resolve only by source-of-truth priority,
- scaffold project,
- establish CI, lint, typecheck, tests.

## Phase 1 — Design system and app shell

- tokens,
- typography,
- basic components,
- routing,
- portrait lock,
- safe-area behavior.

## Phase 2 — SQLite and seed content

- schema,
- migrations,
- repositories,
- seed import,
- content validation.

## Phase 3 — Virtual keyboard

- EN QWERTY,
- KO Dubeolsik layout,
- Pressable hitboxes,
- key animation,
- context-adaptive rows.

## Phase 4 — Korean composer

- pure/tested composition engine,
- backspace,
- normalization,
- edge-case suite.

## Phase 5 — Audio and haptic engine

- preload,
- overlapping playback,
- sound categories,
- settings.

## Phase 6 — Typing engine

- input state,
- accepted answers,
- live prefix validation,
- mistake tracking,
- response timing.

## Phase 7 — Cold-open tutorial

- UI language,
- study language,
- immediate 3-item tutorial,
- first key tactile hook,
- result/reward,
- first Home arrival.

## Phase 8 — Guided / Learn

- ghost rendering,
- session flow,
- stage updates.

## Phase 9 — Recall / Review

- hidden target,
- hint system,
- mastery update,
- review scheduling.

## Phase 10 — Speed

- timing,
- scoring/ranks,
- combo,
- result.

## Phase 11 — Word Rain

- falling objects,
- matching,
- score attack,
- performance bounding.

## Phase 12 — Progression / Economy / Collection

- XP,
- level,
- Token ledger,
- keyboard unlock/equip,
- theme change.

## Phase 13 — Daily habit

- Daily Goal,
- streak,
- local reminder scheduling,
- permission request UX.

## Phase 14 — Monetization adapters

- rewarded-ad mock + production adapter shell,
- RevenueCat mock + production adapter shell,
- caps and reward idempotency.

## Phase 15 — Analytics / Sentry

- events,
- privacy-safe payloads,
- failure-safe provider behavior.

## Phase 16 — Automated and visual QA

- unit/integration suite,
- Maestro flows,
- screenshots at required sizes,
- self-review and fixes.

## Phase 17 — Build readiness and documentation

- Expo validation,
- EAS config,
- Android/iOS build attempt where environment permits,
- README,
- QA report,
- release checklist,
- external blocker list.
