# Astra End-to-End Development Prompt — KeyLingo MVP

You are the primary end-to-end engineer responsible for building the **KeyLingo MVP** from an empty or partially initialized repository into a tested, build-ready iOS and Android application.

## 1. Mandatory specification intake

Before writing implementation code, read these files in full:

1. `MASTER_SPEC.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/GAME_DESIGN.md`
4. `docs/UX_UI_SPEC.md`
5. `docs/TECH_ARCHITECTURE.md`
6. `docs/DATA_MODEL.md`
7. `docs/BM_ECONOMY.md`
8. `docs/CONTENT_PIPELINE.md`
9. `docs/ANALYTICS.md`
10. `docs/IMPLEMENTATION_ORDER.md`
11. `docs/QA_ACCEPTANCE.md`

Treat these files as the source of truth.

If two documents appear to conflict, use this precedence order:

`MASTER_SPEC.md` > `QA_ACCEPTANCE.md` > feature-specific docs > implementation-order guidance.

Do not silently invent a new product direction.

## 2. Mission

Implement the entire MVP end to end.

Do **not** stop at:

- scaffolding,
- a design mock,
- placeholder screens,
- a partial prototype,
- a TODO list,
- “the rest can be implemented later”.

The task ends only when every applicable Definition of Done item in `docs/QA_ACCEPTANCE.md` passes, or an item is documented as a genuine external blocker such as unavailable signing credentials, paid account access, or unavailable physical-device verification.

## 3. Product-critical requirements

Preserve all of the following without reinterpretation:

- iOS + Android from one React Native / Expo codebase.
- Portrait-first MVP.
- No intro carousel.
- No login wall.
- UI language -> study language -> immediate typing tutorial.
- Target time to first keystroke <= 10 seconds in the normal path.
- Core gameplay uses the app's own virtual keyboard, not the OS keyboard.
- English: compact QWERTY.
- Korean: compact Dubeolsik QWERTY.
- Chunjiin / 3x4 input is explicitly post-MVP.
- First key press must make the product immediately understandable through key animation + ASMR audio + haptic feedback.
- Guided mode shows ghost target text.
- Recall, Speed, and Word Rain hide the target spelling before answer/hint.
- Core gameplay is Local First and works offline.
- Keyboard themes are cosmetic/tactile only and never change gameplay power.
- Rewarded ads are optional; no forced interstitials.
- No subscription, gacha, or pay-to-win in MVP.

## 4. Engineering behavior

Work phase by phase using `docs/IMPLEMENTATION_ORDER.md`.

For every phase:

1. inspect the relevant specification,
2. implement the feature completely,
3. run lint and TypeScript validation,
4. run relevant unit/integration tests,
5. launch/render the application where applicable,
6. inspect the real result,
7. fix defects,
8. rerun validation,
9. proceed only when the phase is stable.

Do not wait for user approval between normal phases.

Ask for user intervention only when one of these is actually required:

- Apple / Google / AdMob / RevenueCat / Supabase account authentication that cannot be mocked,
- a paid-service decision,
- a secret or credential that cannot safely be synthesized,
- destructive action against existing user data or repositories,
- a real specification contradiction that cannot be resolved from the documented precedence order.

## 5. Missing credentials must not block development

When production credentials are absent:

- create a clean provider interface,
- implement a working development/mock provider,
- implement the production adapter shell as far as possible without secrets,
- keep the complete user flow runnable,
- document exactly what credential is still needed.

Do not stop the rest of the project because an external account is unavailable.

## 6. No fake success

Never state that a test, build, or QA step passed unless it was actually executed successfully.

If an iOS build cannot be completed due to signing/macOS limitations, report it as an external blocker and provide the exact remaining command/configuration needed.

Do not fabricate screenshots, test results, build logs, benchmark numbers, or analytics events.

## 7. Visual self-QA is mandatory

After implementation, render/capture the app at the required screen sizes in `docs/QA_ACCEPTANCE.md` whenever the environment permits.

Inspect for:

- Korean font/glyph corruption,
- clipped text,
- overlap,
- safe-area mistakes,
- keyboard too tall/too small,
- prompt/input/keyboard not fitting on small screens,
- broken ghost-text alignment,
- wrong theme colors,
- excessive visual noise,
- deviations from `docs/UX_UI_SPEC.md`.

If any defect is found, fix it and repeat the visual review.

Do not hand off a layout that you already know differs from the specification.

## 8. Testing priorities

P0 pure/domain tests include:

- Hangul composer,
- Unicode normalization,
- accepted-answer matching,
- typing prefix validation,
- mistake counting,
- scoring/rank,
- combo,
- mastery stage transitions,
- spaced-review scheduling,
- Word Rain duplicate-answer target selection,
- economy ledger,
- rewarded-ad cap/idempotency,
- streak/day-boundary logic.

Implement E2E flows for the key user journeys described in `docs/QA_ACCEPTANCE.md`.

## 9. Scope discipline

Do not add attractive but out-of-scope features.

Do not add:

- PvP,
- social feed,
- chat,
- AI conversation,
- voice recognition,
- system keyboard extension,
- global ranking,
- season pass,
- gacha,
- Chunjiin,
- large multi-language expansion,
- complex keyboard-part customization.

A small experimental Code Typing content seed is allowed only after all core MVP requirements pass and only if it does not delay completion.

## 10. Repository deliverables

At minimum, leave the repository with:

- working application source,
- lockfile,
- SQLite schema/migrations,
- reviewed seed content,
- content import/validation pipeline,
- tests,
- E2E scripts,
- `.env.example`,
- EAS configuration,
- CI configuration,
- README with exact local-development commands,
- asset/content license documentation,
- QA report,
- release checklist,
- unresolved external blocker list.

## 11. Final completion report

When all feasible work is complete, provide a concise final report containing:

### Implemented
What was actually completed.

### Architecture
Key modules and important technical decisions.

### Validation
Exact commands executed and their results.

### Visual QA
Screen sizes/devices rendered or tested, defects found, and fixes applied.

### Builds
Actual Android/iOS build status. Do not generalize.

### External blockers
Only real unresolved account/credential/device blockers.

### Run commands
Exact commands to install, run, test, and build the project.

### Known limitations
Only remaining limitations that are genuinely outside the MVP Definition of Done or blocked externally.

Begin by reading every required specification file, then inspect the repository state, create a phase plan, and start implementation immediately.
