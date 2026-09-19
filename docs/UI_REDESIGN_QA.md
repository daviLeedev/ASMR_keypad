# UI architecture redesign validation — 2026-09-19

The implementation follows the route hierarchy in UX_UI_SPEC.md. Home recommends
one session; Play separates Learning and Arcade; Collection presents full-width
keyboard exhibits with dedicated trial/unlock/equip details; Progress displays
stored activity. Settings is secondary. Gameplay and results remain dedicated
screens. Product/economy rules and existing glide-touch work are preserved.

## Completed checks

- TypeScript typecheck and ESLint: passed.
- Unit tests: 12 suites, 133 tests passed.
- Native component tests: 4 suites, 16 tests passed, including live OS motion
  preference changes, app preference precedence and subscription cleanup.
- Playwright: 31 tests passed, including tutorial, offline recall/arcade eligibility,
  sentence input, results, collection gating, unlock/equip and reload persistence.
- Expo doctor: 18/18 checks passed.
- Web export and Android/iOS JavaScript bundle exports: passed.
- Korean and English shell captures at 375×667, 390×844 and 430×932: 48 images
  under `artifacts/screenshots/redesign/`. Automated checks cover horizontal
  overflow and Home's primary action above the fixed navigation. Representative
  Home, Play, Learning, Collection, keyboard detail and Progress captures were
  visually inspected. Existing gameplay tests cover prompt/answer/keyboard fit,
  including 320×568 sentence layouts.

## Scope of evidence

Browser checks use mock providers. Bundle exports are not signed native binaries
or physical-device tests. Maestro, device safe areas, real sound/haptic latency,
multi-touch during scroll, and screen-reader behavior need device verification.
Native signing/build prerequisites remain documented in EXTERNAL_BLOCKERS.md.
No production advertising, billing or notification delivery is certified here.

## Motion/icon refinement

Replaced shell text symbols with local SVG vectors, added active-tab icon pills,
button compression/recovery, route-specific native transitions and web content
entrances. Added an actionable Progress empty state. After these changes,
typecheck, lint, all 31 browser tests, all 16 native component tests, Expo doctor
and Android/iOS bundle exports passed. Native transition feel still requires a
physical-device check. Screenshot capture waits for the entrance to complete.
