# Release checklist

This is a list of gates to execute, not a record of passing results. Record actual outputs, build URLs, device models, OS versions, and screenshot paths in the release evidence. See [external blockers](EXTERNAL_BLOCKERS.md) for the current workstation limits and [QA acceptance](QA_ACCEPTANCE.md) for the full definition of done.

## Reproducible validation

- [ ] Use Node 22.22.0 or a compatible newer Node 22 release and install from `package-lock.json` with `npm ci`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm test` and review all suite failures, not just changed files.
- [ ] Run `npm run content:validate`; verify original seed provenance and reviewed Korean/English accepted answers.
- [ ] Run `npm run doctor`; resolve or document every compatibility warning.
- [ ] Run `npm run test:native` and `npm run test:e2e`.
- [ ] Set `EXPO_PUBLIC_PROVIDER_MODE=mock` for a preview, then run `npm run export:web`.
- [ ] Inspect the GitHub Actions `KeyLingo validation` run and its `keylingo-web-preview` artifact. A committed workflow is not evidence that CI ran.

The workflow pins Node 22.22.0 and the doctor CLI version. Web export checks bundling; it does not prove a native Android/iOS build or device behavior.

## Native build and installation

- [ ] Configure the real Expo project/account and verify `npx eas-cli whoami`.
- [ ] Confirm the application identifiers in `app.config.ts` are owned and final.
- [ ] Build Android preview with `npx eas-cli build --platform android --profile preview`; capture the build ID and installable APK.
- [ ] Install the preview on an emulator or test device using `adb install -r <preview.apk>`.
- [ ] Build iOS preview with `npx eas-cli build --platform ios --profile preview`; provision the intended physical devices and install the signed build.
- [ ] For local builds, install compatible platform SDK/toolchains first. Local iOS compilation requires macOS/Xcode.
- [ ] Validate production native builds with `--profile production` after SDK adapters, app ownership, and signing are configured. Do not submit to stores until all applicable gates pass.

## Automated native flows

Use a dedicated test device or emulator: the tutorial flows reset this app's local progress. Install Maestro and the standalone preview app first. These flows use the in-app virtual keys, not OS keyboard text injection.

```sh
maestro test e2e/01-tutorial-english.yaml
maestro test e2e/02-tutorial-korean.yaml
maestro test e2e/03-navigation-persistence.yaml
```

- [ ] Korean UI / English learning: `apple`, `water`, then hidden-answer `apple` Recall completes.
- [ ] English UI / Korean learning: `사과`, `물`, then hidden-answer `사과` Recall completes.
- [ ] Dubeolsik compound vowel and final-consonant backspace work using visible-jamo key IDs.
- [ ] No full Recall answer appears before input/submission; inspect the captured screenshots as well as the assertions.
- [ ] Completed tutorial survives an app restart; Home, Collection, Settings, and Practice deep links open.
- [ ] Attach native Maestro reports. YAML parsing alone is not an executed flow.

The first words come from `content/seed.ts`: `ko-en-word-001/002` and `en-ko-word-001/002`. Update flow fixtures if those reviewed tutorial items intentionally change. The navigation flow invokes the Korean tutorial first and therefore resets data too. Platform deep-link confirmation dialogs may require accepting the link once on the test device.

Flow syntax references: Maestro [tapOn](https://docs.maestro.dev/reference/commands-available/tapon), [runFlow](https://docs.maestro.dev/reference/commands-available/runflow), and [openLink](https://docs.maestro.dev/reference/commands-available/openlink).

## Physical-device experience

- [ ] First-run keyboard appears in <=10 seconds on a normal cold launch, without a login or permission gate.
- [ ] Test first press-in sound, key depression, typed feedback, and light haptics together. Measure perceived latency on representative Android and iPhone hardware.
- [ ] Listen to all eight themes at low/high volume and fast overlapping input; check no clipping, audible gaps, stuck players, or unexpected autoplay.
- [ ] Verify Sound Off, volume zero, Haptics Off, reduced effects, device silent-mode behavior, and devices without haptic support.
- [ ] Confirm switches and theme selection persist; switching themes updates the active sound pack.
- [ ] Capture and inspect gameplay, result, collection, and settings at 375×667, 390×844, and 430×932 logical sizes. Check Korean glyphs, safe areas, touch targets, and no gameplay scrolling/overlap.
- [ ] Ensure English and Korean gameplay never summon the OS keyboard.
- [ ] Run a full 60-second Word Rain round, max eight falling prompts, correct duplicate matching, misses, and background/resume. Inspect frame timing on target hardware.
- [ ] Check Guided→Recall→Speed progression, wrong answer correction, partial hints, mastery evidence, and no answer leaks.

## Offline, storage, and daily habit

- [ ] With networking disabled, cold launch and complete tutorial, Learn, Recall, Speed, and Word Rain; verify progression, collection, daily goal, and streak persist after restarting.
- [ ] Test daily goals 5/10/20 minutes, local midnight, daylight-saving/timezone changes, streak freeze, and no double reward after reopening.
- [ ] Verify active study time stops while backgrounded/paused/idle and resumes correctly.
- [ ] Schedule an explicitly opted-in local reminder. Confirm no permission request occurs at initial launch.
- [ ] Verify permission granted/denied, replacement schedule, cancellation, and an actual notification arriving at the selected local time.
- [ ] Tap a reminder with the app warm and fully terminated; verify today's practice opens once and old taps do not repeat.
- [ ] Validate real device process death/reopen SQLite durability and recovery from storage errors.

## Monetization and privacy

- [ ] Preview UI labels ads and purchases as development simulations; no mock result appears as a real payment.
- [ ] Verify ad dismissal/failure grants zero, completion grants once, and the configurable daily limit survives restart.
- [ ] Configure and device-validate the implemented native AdMob and RevenueCat bridges as described in [service integration](../src/services/README.md). Supply platform-specific public SDK keys, real AdMob app/unit IDs, UMP consent messages, and the non-consumable Starter Pack offering/entitlement. Automated bridge tests do not prove a real ad or store transaction.
- [ ] Use store sandbox products and AdMob test units to validate success, cancellation, no network, double taps, purchase/restore across relaunch, and receipt deduplication.
- [ ] Confirm prices are the SDK's localized store prices and the Starter Pack SKU/contents match configuration.
- [ ] Verify production uses `EXPO_PUBLIC_PROVIDER_MODE=production` and cannot grant simulated receipts when an SDK is unavailable.
- [ ] If telemetry is enabled, configure consent as appropriate, disable replay/input capture, and inspect real outgoing events for raw answers, typed text, addresses, or other unnecessary data.
- [ ] Review `ASSET_LICENSES.md`, content provenance, store privacy disclosures, permissions, and removal of all test credentials before submission.

## Release record

Record the commit, lockfile, configuration/environment, native build IDs, test reports, screenshots, physical device measurements, and every unresolved blocker. Only check a gate after its evidence exists. Credentials/device gaps are explicit blockers. Current native preparation/export evidence and the failed local Android build attempt are recorded in [external blockers](EXTERNAL_BLOCKERS.md); prebuild and Hermes bundles do not count as a compiled installable binary.
