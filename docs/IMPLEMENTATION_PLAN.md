# KeyLingo implementation plan

Goal: deliver the complete offline-first bilingual typing MVP in MASTER_SPEC.md and the ten linked specifications.

Architecture: Expo Router screens consume a Zustand application controller. Pure domain modules own composition, matching, scoring, learning and economy. SQLite owns durable local state and relational content; adapters isolate device and external services. The web target provides inspectable layouts and an additional E2E surface, not a substitute for physical mobile QA.

Global constraints: portrait iOS/Android, no login/intro, two selections before typing, 3 tutorial items (2 guided, 1 recall), hidden spelling in recall/speed/rain, 60-second rain with at most 8 objects, cosmetic-only themes, opt-in ads/reminders, no raw typed analytics.

Review focus: duplicate completion/reward delivery; background time counting; compound Hangul during prefix checking; corrupted/migrated persistence; long Korean/English sentences at 375x667.

## Phases and validation

- [x] 0–1: bootstrap SDK-compatible Expo/Router/TypeScript/Jest/ESLint, tokens and safe-area shell. Files: package.json, app.config.ts, app/_layout.tsx, src/design-system. Validate typecheck/lint and render shell.
- [x] 2: content schema, versioned reviewed seed and import, SQLite migrations and repository. Files: src/content, content, src/db. Test invalid packs, duplicate answers, Unicode, checksum and restart persistence.
- [x] 3–6: touch keyboard, pure Hangul composer, audio pools/haptics, typing state. Files: src/domain, src/audio, src/components/Keyboard.tsx. Test consonants/vowels/finals/backspace, alternate answers, error transitions; render both layouts.
- [x] 7–10: cold-open, guided, recall and speed. Files: src/state, src/screens, app routes. Test exactly three tutorial items, hidden targets, partial hints, wrong corrections, stage changes, response timing/rank/combo.
- [x] 11: Word Rain. Test 60-second completion, eligible-only selection, urgency tie-break, bounds and miss reset; render falling area and keyboard.
- [x] 12–13: XP/economy, eight keyboard themes, goal/streak/reminders. Test duplicate ledger references, insufficient balance/level, day boundaries and paused time.
- [x] 14–15: mock + production service adapters, privacy-safe analytics and error capture. Test ad failure/cancellation/caps, purchase/restore idempotency and offline failure.
- [x] 16: run full unit/integration tests, lint/typecheck; implement Maestro and browser E2E. Capture and inspect 375x667, 390x844, 430x932 both languages; fix and repeat defects.
- [x] 17: Expo doctor, native export/prebuild and available builds. Record exact outcomes and external limitations in QA_REPORT.md, RELEASE_CHECKLIST.md and EXTERNAL_BLOCKERS.md. Supply README, licenses, .env.example, EAS and CI.

Execution: user explicitly authorized uninterrupted phased delivery. Independent pure-domain/content/provider work may run in parallel under dispatching-parallel-agents; application integration and phase gates remain owned by the primary engineer. Each behavioral subsystem starts with failing tests, then implementation, then relevant and whole-suite checks. No fabricated device/build evidence.

## Execution ledger

- Intake: all 11 mandatory specifications read. Directory contains only specifications, no Git repository or application. No specification contradiction found. Optional suggested seed quantities do not override reviewed-content quality.
- Ruling: work directly in the explicitly named, otherwise empty project directory; no existing checkout to isolate. Existing specification files preserved.
- Ruling: latest stable registry Expo is 57.0.24 (SDK 57), verified against official release notes. Use Expo's bundled compatible versions and a lockfile.

- Final local gates: strict typecheck and lint clean; 130 pure/integration tests, one native renderer test, browser regression suite, content validation and Expo doctor18/18. Native Android project and both Hermes bundles generated. Native binary/device/credential gates are recorded as external in QA_REPORT.md; checked phases mean all feasible local work executed, not signed release approval.
- Review fixes: fast key taps, partial Hangul ghosts, sentence entry, timing/rank, duplicate navigation, persisted Rain score, SDK bridges, profile validation and SQLite incremental writes. All scoped tests reintegrated and full validations rerun.
- Ruling: smaller original reviewed seed (244 directional items) satisfies verified-seed requirement; suggested bulk counts are nonmandatory. No unlicensed dictionary data added.
- Ruling: native compilation/signing/device gates remain external due absent Android SDK/ADB, Windows without macOS/Xcode, no EAS login and unavailable physical devices; no binaries claimed.
