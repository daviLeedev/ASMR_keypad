# QA / Acceptance Criteria

This file defines the MVP Definition of Done.

Astra must not declare completion until every applicable item passes or is explicitly marked as an external blocker with evidence.

## 1. First-run / onboarding

- [ ] Device language is detected and a supported UI language is preselected.
- [ ] User can confirm/change UI language.
- [ ] User can choose study language/direction.
- [ ] There is no intro carousel before first gameplay.
- [ ] There is no account/login wall.
- [ ] Notification permission is not requested before a user explicitly opts into reminders.
- [ ] Time-to-first-keystroke path is designed to be <= 10 seconds under normal interaction.
- [ ] Micro tutorial contains Guided typing and at least one Recall item.

## 2. Guided / ghost typing

- [ ] Target answer is visible as ghost text.
- [ ] Typed prefix visually replaces the ghost prefix.
- [ ] Remaining suffix stays visually ghosted.
- [ ] Wrong input state is visible without excessive shake/flash.
- [ ] Guided reward is lower than Recall/Speed reward.
- [ ] Guided-only items do not enter Word Rain.

## 3. Recall

- [ ] Target spelling is not visible before submission/hint.
- [ ] Optional hint cannot silently reveal full answer by default.
- [ ] Hint use lowers reward/mastery gain.
- [ ] Wrong answer can show correction after submission.
- [ ] Mastery/review schedule updates.

## 4. Speed

- [ ] No target spelling is exposed before input.
- [ ] Word response time is measured.
- [ ] Sentence WPM/accuracy is measured.
- [ ] Rank logic is config-driven and unit-tested.
- [ ] Combo behaves correctly.
- [ ] Personal best is stored where applicable.

## 5. Word Rain

- [ ] 60-second score attack launches and completes.
- [ ] Falling prompts do not expose target spelling.
- [ ] Correct typing removes the intended falling item.
- [ ] Duplicate accepted answer removes the lowest/most urgent matching item.
- [ ] Miss resets combo.
- [ ] Max simultaneous objects is bounded.
- [ ] No severe frame drops in normal target conditions.

## 6. Virtual keyboard

- [ ] English QWERTY works.
- [ ] Korean Dubeolsik works.
- [ ] System keyboard does not open during core gameplay.
- [ ] Key press visual begins on press-in.
- [ ] Key touch targets remain usable on small screens.
- [ ] Word mode hides unnecessary controls where designed.
- [ ] Sentence mode provides Space.
- [ ] Backspace works through Korean composition states.

## 7. Korean composition

Unit/integration tests must cover:

- [ ] basic consonant + vowel composition,
- [ ] final consonant,
- [ ] compound vowel,
- [ ] compound final consonant,
- [ ] backspace decomposition,
- [ ] NFC/NFD comparison safety,
- [ ] answer matching after composition.

## 8. Audio / haptics

- [x] Active sound pack preloads without creating players inside a key event.
- [x] Rapid key presses rotate through overlapping player voices.
- [x] Normal keys use every shuffle-bag variant before repeating.
- [x] Press and release route to independent pools.
- [x] Space/backspace categories route correctly.
- [x] Glide releases the previous key before pressing the next key.
- [x] Cancel and two simultaneous pointers have independent release lifecycles.
- [x] Sound mute and bounded volume work.
- [x] Haptics fire on press only and respect the toggle.
- [x] Missing release samples and audio/haptic failures fail gracefully.
- [x] Seven physical packs pass format, provenance, duration, peak, silence and hash validation.
- [x] Audio credits are bundled and open without an external request.
- [ ] Android and iPhone onset, speaker/headphone character and clipping are checked on hardware.

Physical-device protocol and results are tracked in [AUDIO_QA.md](AUDIO_QA.md).
Static bundle export is not device certification.

## 9. Economy / collection

- [ ] XP and level update correctly.
- [ ] Token grants/spends use economy service/ledger.
- [ ] Cannot unlock with insufficient Token or unmet level gate.
- [ ] Unlock is idempotent.
- [ ] Equipping a keyboard updates visuals.
- [ ] Equipping a keyboard updates active sound pack.
- [ ] No keyboard changes scoring power.

## 10. Daily habit

- [ ] Daily goal supports 5/10/20 minutes.
- [ ] Active study time accumulates correctly.
- [ ] Daily completion reward is not duplicated incorrectly.
- [ ] Streak updates across calendar days.
- [ ] Reminder can be scheduled locally.
- [ ] Notification tap deep-links into today's practice where supported.

## 11. Ads / IAP adapters

- [ ] Dev mocks allow complete flow without credentials.
- [ ] Rewarded-ad daily cap works.
- [ ] Failed/cancelled ad does not grant reward.
- [ ] Successful rewarded completion grants exactly once.
- [ ] Purchase UI fails gracefully without configured provider.
- [ ] Store price is not hardcoded.

## 12. Offline

With network disabled, verify:

- [ ] app boot,
- [ ] Home,
- [ ] Guided,
- [ ] Recall,
- [ ] Speed,
- [ ] Word Rain,
- [ ] progression,
- [ ] collection,
- [ ] daily goal/streak.

## 13. Responsive visual QA

Render and inspect at minimum:

- [ ] 375x667
- [ ] 390x844
- [ ] 430x932

For each:

- [ ] no clipped Korean/English text,
- [ ] no overlapping components,
- [ ] no broken font rendering,
- [ ] no horizontal overflow,
- [ ] gameplay prompt + answer + keyboard fit without vertical scrolling,
- [ ] safe-area insets respected.

Astra must take screenshots/render captures where tooling allows, inspect them, fix issues, and rerun visual QA.

## 14. Automated validation

Must pass:

- [ ] lint
- [ ] TypeScript typecheck
- [ ] unit tests
- [ ] core integration tests
- [ ] Maestro core flows where environment allows
- [ ] Expo doctor / equivalent compatibility validation

## 15. Build readiness

- [ ] Android build or documented external credential blocker
- [ ] iOS build or documented external credential/macOS/signing blocker
- [ ] `.env.example` exists
- [ ] no real secrets committed
- [ ] EAS profiles documented
- [ ] release checklist exists

Never report a build/test as passed unless it actually ran successfully.

## 16. UI architecture redesign (2026-09-19)

Revision-specific evidence is recorded in [UI_REDESIGN_QA.md](UI_REDESIGN_QA.md).
The checklist above remains the full release checklist, not a claim that native
device and external-provider checks have run.

- [x] Home contains one recommended session action, with no flat mode menu.
- [x] Learning and Arcade have dedicated selection routes.
- [x] Collection uses full-width exhibits and dedicated keyboard trial/details.
- [x] Unlock gates and equipped selection persist through reload.
- [x] Four primary destinations use navigation outside scrolling content.
- [x] Both languages captured at the three target mobile sizes.
- [x] Unit, native component and browser regression tests pass.
- [ ] Physical-device interaction, safe-area and accessibility release checks.
