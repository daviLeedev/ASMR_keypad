# Physical Keyboard Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synthetic one-shot effects with offline, licensed press/release multisamples that make each KeyLingo keyboard sound and respond like a distinct physical switch family.

**Architecture:** The audio engine will preload a two-phase pack for the selected theme, choose variants through non-repeating shuffle bags, and overlap short-lived player voices. `Keyboard` will translate press, release, cancel, and glide transitions into audio phases while preserving the current input path. A deterministic asset pipeline will convert licensed source recordings to validated 48 kHz mono WAV files and retain provenance beside each theme.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript 6, `expo-audio`, `expo-haptics`, Jest, React Native Testing Library, Node.js asset scripts, FFmpeg/FFprobe for asset preparation.

**Spec:** `docs/superpowers/specs/2026-09-19-physical-keyboard-audio-design.md`

## Global Constraints

- Core keyboard packs use real MIT or CC0 recordings; ElevenLabs free output is excluded from the shipping app.
- Processed assets are mono PCM WAV, 48 kHz, 16-bit, with no more than 3 ms leading silence and peaks no higher than -3 dBFS.
- Normal press clips target 40–145 ms; release clips target 25–110 ms. Retro may keep a longer natural ring when recorded provenance explains it.
- Audio, decoding, haptics, and player failures never block input, Korean composition, scoring, navigation, or economy behavior.
- Only the selected theme is preloaded. No file reads or player creation occur during a key event.
- Haptics fire on press only. Reduced motion does not disable audio.
- Previewing a theme never unlocks, equips, or spends tokens.
- Imported audio retains source URL, author, license, download date, source hash, output hash, and processing notes.

## Review Focus

- A touch cancelled outside a key must release the current audio state once and must not enter another character; Task 2 adds this native component test.
- Two fingers pressing different keys must receive independent press/release events; Task 2 adds a managed-touch test with two identifiers.
- A rapid theme switch whose first preload finishes last must not restore stale players; Task 1 extends the generation-race test.
- A pack with a missing release category must remain silent on release rather than borrowing another theme; Task 1 adds this engine test.
- A source file with excessive leading silence, duration, peak, or absent provenance must fail before export; Task 3 adds validator fixture tests.

---

### Task 1: Two-phase audio engine and pack contract

**Files:**
- Modify: `src/audio/engine.ts`
- Modify: `src/audio/index.ts`
- Modify: `src/audio/packs.ts`
- Modify: `tests/providers.test.ts`

**Interfaces:**
- Produces: `type KeyPhase = "press" | "release"`.
- Produces: `type PhaseSamples = Partial<Record<KeyCategory, readonly number[]>>`.
- Produces: `type SoundPack = Record<KeyPhase, PhaseSamples>`.
- Produces: `AudioEngine.trigger(phase: KeyPhase, category: KeyCategory, settings: KeySettings): void`.
- Produces: `playKey(phase: KeyPhase, category: KeyCategory, settings: KeySettings): void` for Task 2.

- [ ] **Step 1: Write the failing engine tests**

Extend `tests/providers.test.ts` with focused tests using numbered sources and fake players:

```ts
const audible = { soundEnabled: true, volume: 0.6, hapticsEnabled: true };
function fakeAudioDriver() {
  const played: number[] = [];
  return {
    played,
    driver: {
      createPlayer(source: number): AudioPlayer {
        return {
          volume: 1,
          seekTo: async () => {},
          play: () => played.push(source),
          remove: () => {},
        };
      },
      haptic: () => {},
    },
  };
}

test("audio routes press and release to independent pools", async () => {
  const { driver, played } = fakeAudioDriver();
  const engine = new AudioEngine(driver, () => 0);
  await engine.preload({
    press: { normal: [11] },
    release: { normal: [21] },
  });
  engine.trigger("press", "normal", audible);
  engine.trigger("release", "normal", audible);
  expect(played).toEqual([11, 21]);
});

test("shuffle bag uses every variant before repeating", async () => {
  const { driver, played } = fakeAudioDriver();
  const engine = new AudioEngine(driver, () => 0.99);
  await engine.preload({
    press: { normal: [11, 12, 13] },
    release: {},
  });
  for (let index = 0; index < 3; index++)
    engine.trigger("press", "normal", audible);
  expect(new Set(played)).toEqual(new Set([11, 12, 13]));
});

test("release without a matching sample is silent and non-fatal", async () => {
  const { driver, played } = fakeAudioDriver();
  const engine = new AudioEngine(driver);
  await engine.preload({ press: { normal: [11] }, release: {} });
  expect(() => engine.trigger("release", "normal", audible)).not.toThrow();
  expect(played).toEqual([]);
});
```

Add assertions that release never calls `driver.haptic()`, overlapping triggers rotate through distinct players, an older asynchronous preload cannot replace a newer pack, volume is clamped, and thrown `play`, `seekTo`, `remove`, and haptic calls remain non-fatal.

- [ ] **Step 2: Run the engine test and verify RED**

Run: `npx jest tests/providers.test.ts --runInBand`

Expected: FAIL because `KeyPhase`, two-phase `SoundPack`, and `trigger` do not exist.

- [ ] **Step 3: Implement two-phase pools and shuffle bags**

Refactor `src/audio/engine.ts` around these exact structures:

```ts
export type KeyPhase = "press" | "release";
export type PhaseSamples = Partial<Record<KeyCategory, readonly number[]>>;
export type SoundPack = Record<KeyPhase, PhaseSamples>;

type VoicePool = { players: AudioPlayer[]; cursor: number; used: Set<AudioPlayer> };
type CategoryPool = { variants: VoicePool[]; bag: number[]; cursor: number };
type PhasePools = Partial<Record<KeyCategory, CategoryPool>>;
```

During preload, construct `Partial<Record<KeyPhase, PhasePools>>`. Create four voices per press asset and two per release asset. Build a shuffled array of variant indexes with Fisher–Yates; consume the full bag before rebuilding it, and swap the first new index when it equals the previously played index. In `trigger`, call haptics only when `phase === "press"`, clamp volume to `0...1`, return quietly for muted settings or absent samples, then rotate through the selected variant's voice pool.

Change `src/audio/index.ts` to export:

```ts
export function playKey(
  phase: KeyPhase,
  category: KeyCategory,
  settings: KeySettings,
): void {
  engine.trigger(phase, category, settings);
}
```

Wrap every existing pack in `src/audio/packs.ts` as `{ press: existingPack, release: {} }`. This preserves the current assets until later tasks replace each pack.

- [ ] **Step 4: Run engine and full unit tests**

Run: `npx jest tests/providers.test.ts --runInBand`

Expected: PASS.

Run: `npm test`

Expected: all unit suites PASS.

- [ ] **Step 5: Commit the engine contract**

```bash
git add src/audio/engine.ts src/audio/index.ts src/audio/packs.ts tests/providers.test.ts
git commit -m "feat: add press and release audio phases"
```

### Task 2: Press, release, cancel, and glide event routing

**Files:**
- Modify: `src/components/Keyboard.tsx`
- Modify: `src/components/Keycap.tsx`
- Modify: `tests/keyboard.native.test.tsx`
- Modify: `tests/keycap.native.test.tsx`

**Interfaces:**
- Consumes: `playKey(phase, category, settings)` from Task 1.
- Produces: `KeycapProps.onRelease: () => void`.
- Produces: `GlideTouchTracker.move(...)` returning `{ entered: string | null; exited: string | null }`.
- Produces: one press/release audio lifecycle per pointer without changing `onKey` semantics.

- [ ] **Step 1: Write failing native interaction tests**

Change the audio Jest mock in `tests/keyboard.native.test.tsx` to capture phase and category:

```ts
const audioEvents: Array<["press" | "release", string]> = [];
jest.mock("../src/audio", () => ({
  preloadTheme: async () => {},
  playKey: (phase: "press" | "release", category: string) =>
    audioEvents.push([phase, category]),
}));
```

Add tests for these exact sequences:

```ts
expect(audioEvents).toEqual([
  ["press", "normal"],
  ["release", "normal"],
]);

expect(audioEvents).toEqual([
  ["press", "normal"],
  ["release", "normal"],
  ["press", "normal"],
  ["release", "normal"],
]);
```

Cover a cancelled touch outside the keyboard and two simultaneous touch identifiers.
Assert that each key still calls `onKey` exactly once on press and never on release.
In `tests/keycap.native.test.tsx`, assert `onRelease` fires once for press-out and
cancel, while disabled keys emit neither callback.

- [ ] **Step 2: Run native tests and verify RED**

Run: `npm run test:native -- --runTestsByPath tests/keyboard.native.test.tsx tests/keycap.native.test.tsx`

Expected: FAIL because release callbacks and phase arguments are absent.

- [ ] **Step 3: Implement pointer lifecycles**

Add a shared category helper in `Keyboard.tsx`:

```ts
const categoryFor = (value: string): KeyCategory =>
  value === "⌫" ? "backspace" : value === " " ? "space" : "normal";
const sound = (phase: KeyPhase, value: string) =>
  playKey(phase, categoryFor(value), settings);
```

Keep `hit(value)` responsible for press sound and input. Add `release(value)` that
only calls `sound("release", value)`. Change `GlideTouchTracker.move` to return both
the previous and next key IDs. On a boundary crossing, release the exited target
before triggering the entered target. On touch end/cancel, resolve and release the
tracked key before deleting the touch. Iterate all `changedTouches`, preserving
independent state per identifier.

Add `onRelease` to `Keycap`. Call it from `onPressOut` after visual return. For native
managed touches, let the parent surface own audio release so `Keycap` does not double
fire. Web continues to use Keycap press-in/press-out directly.

- [ ] **Step 4: Run native and unit regression tests**

Run: `npm run test:native`

Expected: all native suites PASS.

Run: `npm test`

Expected: all unit suites PASS.

- [ ] **Step 5: Commit interaction routing**

```bash
git add src/components/Keyboard.tsx src/components/Keycap.tsx tests/keyboard.native.test.tsx tests/keycap.native.test.tsx
git commit -m "feat: synchronize key press and release audio"
```

### Task 3: Deterministic asset processor, validator, and Brown reference pack

**Files:**
- Create: `scripts/process-keyboard-audio.cjs`
- Create: `scripts/validate-audio-assets.cjs`
- Create: `tests/audio-assets.test.ts`
- Create: `assets/audio/THIRD_PARTY_NOTICES.md`
- Create: `assets/audio/starter/provenance.json`
- Create: `assets/audio/starter/press/*.wav`
- Create: `assets/audio/starter/release/*.wav`
- Modify: `src/audio/packs.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `node scripts/process-keyboard-audio.cjs --manifest <path> --source <path> --output <path>`.
- Produces: `validatePack(root: string, options?: { probe?: ProbeAudio }): Promise<ValidationIssue[]>` exported by `scripts/validate-audio-assets.cjs`; `ProbeAudio` returns codec, channels, sample rate, duration, peak, and leading-silence measurements.
- Produces: `npm run audio:validate`.
- Consumes: `SoundPack` from Task 1.

- [ ] **Step 1: Write failing validator tests and fixtures**

In `tests/audio-assets.test.ts`, create temporary sentinel files and inject a
`ProbeAudio` fake that returns controlled WAV metadata. Test that `validatePack`
reports exact issue codes:

```ts
expect(codes).toContain("PROVENANCE_MISSING");
expect(codes).toContain("FORMAT_UNSUPPORTED");
expect(codes).toContain("LEADING_SILENCE");
expect(codes).toContain("PEAK_TOO_HIGH");
expect(codes).toContain("DURATION_OUT_OF_RANGE");
expect(codes).toContain("CATEGORY_MISSING");
```

Add a valid fixture containing five normal press variants, normal release, and
press/release Space, Enter, and Backspace; expect no issues. The validator treats
six normal press variants as the production target but permits the upstream Brown
pack's five genuine variants instead of duplicating a recording.

- [ ] **Step 2: Run the asset test and verify RED**

Run: `npx jest tests/audio-assets.test.ts --runInBand`

Expected: FAIL because the validator module does not exist.

- [ ] **Step 3: Implement processing and validation scripts**

`process-keyboard-audio.cjs` reads a JSON manifest whose entries explicitly map each
source filename to `phase`, `category`, and output filename. Execute FFmpeg without a
shell using `spawnSync("ffmpeg", args)`. Use these filters and output flags:

```js
const filters = [
  "highpass=f=25",
  "silenceremove=start_periods=1:start_duration=0:start_threshold=-52dB",
  "afade=t=in:d=0.002",
  "afade=t=out:st=0.095:d=0.005",
  "alimiter=limit=0.7079",
];
const outputArgs = ["-ac", "1", "-ar", "48000", "-sample_fmt", "s16"];
```

Calculate the fade-out start from probed duration so short release files are not
truncated. Calculate SHA-256 for input and output files, then write the finalized
hashes into `provenance.json`. `validate-audio-assets.cjs` calls FFprobe to verify
codec, channels, sample rate, duration, peak, and silence start. Its CLI validates
every theme directory and exits non-zero with one line per issue.

Add scripts:

```json
"audio:validate": "node scripts/validate-audio-assets.cjs",
"audio:process": "node scripts/process-keyboard-audio.cjs"
```

- [ ] **Step 4: Import and process the Brown Tactile reference pack**

Use the MIT `mxbrown-travel` source from `cjlangan/MechSim`. Map
`GENERIC_R0...R4`, `SPACE`, `ENTER`, and `BACKSPACE` under both available phases.
Run the processor into `assets/audio/starter/press` and `release`. Record the upstream
commit SHA, MIT license text, source URL, author/maintainer credits, UTC download
date, source hashes, output hashes, and all FFmpeg filters in provenance.

Replace only the `starter` entry in `src/audio/packs.ts` with static `require` calls
for the new press and release WAV files. Do not use directory globbing because Metro
requires static asset paths.

- [ ] **Step 5: Validate assets and exports**

Run: `npx jest tests/audio-assets.test.ts --runInBand`

Expected: PASS.

Run: `npm run audio:validate`

Expected: PASS for starter; other legacy theme directories are reported as explicitly
grandfathered by a top-level `legacyThemes` list until Task 4 replaces them.

Run: `$env:EXPO_PUBLIC_PROVIDER_MODE='mock'; npm run export:web`

Expected: web export completes and includes the starter WAV assets.

- [ ] **Step 6: Commit the reference pack and pipeline**

```bash
git add scripts/process-keyboard-audio.cjs scripts/validate-audio-assets.cjs tests/audio-assets.test.ts package.json assets/audio/THIRD_PARTY_NOTICES.md assets/audio/starter src/audio/packs.ts
git commit -m "feat: add licensed Brown tactile audio pack"
```

### Task 4: Remaining switch families, theme metadata, and audio credits

**Files:**
- Create: `assets/audio/<theme>/provenance.json` for `clicky`, `creamy`, `thock`, `retro`, `sky`, and `midnight`
- Create: processed `press/*.wav` and `release/*.wav` beneath those six theme directories
- Create: `src/audio/credits.ts`
- Create: `app/audio-credits.tsx`
- Modify: `src/audio/packs.ts`
- Modify: `src/design-system/theme.ts`
- Modify: `src/localization/redesign.ts`
- Modify: `app/settings.tsx`
- Modify: `assets/audio/THIRD_PARTY_NOTICES.md`
- Modify: `tests/theme.test.ts`
- Create: `tests/audio-credits.native.test.tsx`

**Interfaces:**
- Consumes: Task 3 processor and validator.
- Produces: `audioCredits: readonly AudioCredit[]` where each record contains `themeId`, `identity`, `source`, `license`, and `author`.
- Produces: `/audio-credits`, reachable from Settings without network access.

- [ ] **Step 1: Write failing metadata and credits tests**

Extend `tests/theme.test.ts` to require every theme to expose an `audioIdentity` and
three `audioTraits`, and require all non-legacy theme IDs to exist in `audioCredits`.
Add `tests/audio-credits.native.test.tsx` asserting the screen renders Brown Tactile,
Blue Click, Cream Linear, Deep Thock, Buckling Spring, Airy Linear, Heavy Linear,
source names, and license identifiers. Pressing the Settings entry must navigate to
`/audio-credits`.

- [ ] **Step 2: Run metadata tests and verify RED**

Run: `npx jest tests/theme.test.ts --runInBand`

Expected: FAIL because theme audio metadata does not exist.

Run: `npm run test:native -- --runTestsByPath tests/audio-credits.native.test.tsx`

Expected: FAIL because the credits screen does not exist.

- [ ] **Step 3: Import six real switch-family packs**

Process these exact upstream identities through Task 3's pipeline:

- `clicky`: Box Navy from kbsim, including its dedicated Space, Enter, and Backspace.
- `creamy`: Cream Full Travel.
- `thock`: Holy Pandas.
- `retro`: Buckling Spring from kbsim with its MIT notice.
- `sky`: Turquoise Full Travel.
- `midnight`: Black Ink from kbsim, including its dedicated special keys.

Record the exact chosen upstream commit and pack name in each provenance file. Do not
manufacture missing normal variants by copying files. Keep `silent` on its legacy
pack and document it as the only remaining legacy generated theme until a cleared
damped source is available.

Update `src/audio/packs.ts` with static two-phase requires for all processed files.
Remove replaced legacy WAV files only after `rg` confirms no static requires remain.

- [ ] **Step 4: Expose honest sound identity and credits**

Extend `KeyboardTheme`:

```ts
audioIdentity: string;
audioTraits: readonly [string, string, string];
```

Use identities from the spec table. Create `src/audio/credits.ts` from committed
provenance, without filesystem reads at runtime. Create `app/audio-credits.tsx` using
`Screen`, `Header`, separators, and plain text source/license data. Add localized
“Audio credits” and explanatory copy to `src/localization/redesign.ts`. Add one
secondary row in Settings that pushes `/audio-credits`.

- [ ] **Step 5: Run asset, metadata, native, and export checks**

Run: `npm run audio:validate`

Expected: PASS for seven real packs and one declared legacy silent pack.

Run: `npm test`

Expected: all unit suites PASS.

Run: `npm run test:native`

Expected: all native suites PASS.

Run: `npm run export:native`

Expected: Android and iOS bundles include every statically required processed asset.

- [ ] **Step 6: Commit remaining packs and credits UI**

```bash
git add assets/audio src/audio/packs.ts src/audio/credits.ts src/design-system/theme.ts src/localization/redesign.ts app/settings.tsx app/audio-credits.tsx tests/theme.test.ts tests/audio-credits.native.test.tsx
git commit -m "feat: add physical switch sound collection"
```

### Task 5: End-to-end verification and release evidence

**Files:**
- Modify: `docs/UX_UI_SPEC.md`
- Modify: `docs/QA_ACCEPTANCE.md`
- Create: `docs/AUDIO_QA.md`
- Modify: `e2e/browser/redesign.spec.ts`

**Interfaces:**
- Consumes: all runtime and asset behavior from Tasks 1–4.
- Produces: a repeatable automated verification record and a physical-device checklist with measured onset fields.

- [ ] **Step 1: Add browser assertions for audio identity and credits navigation**

In `e2e/browser/redesign.spec.ts`, open `/keyboard/starter`, assert Brown Tactile and
its three traits are visible, then open Settings → Audio credits and assert the MIT
and CC0 notices render with no network request. Keep screenshots for Korean and
English at 375×667, 390×844, and 430×932.

- [ ] **Step 2: Run the focused browser flow**

Run: `npx playwright test e2e/browser/redesign.spec.ts`

Expected: all redesign tests PASS with the Task 4 identity and credits UI.

- [ ] **Step 3: Document implemented behavior and device protocol**

Update `docs/UX_UI_SPEC.md` with the two-phase sound behavior and collection identity.
Update `docs/QA_ACCEPTANCE.md` with automated audio checks. Create `docs/AUDIO_QA.md`
containing a table with Android/iPhone, built-in speaker/headphones, theme, press,
release, Space, Backspace, three-key glide, mute, app resume, and measured onset.
Leave physical-device cells unchecked until they actually run; bundle export is not
device certification.

- [ ] **Step 4: Run the complete verification matrix**

Run, in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:native
npm run audio:validate
npx playwright test
npm run doctor
$env:EXPO_PUBLIC_PROVIDER_MODE='mock'; npm run export:web
npm run export:native
git diff --check
```

Expected: every command exits 0. Record exact suite/test counts and the Android/iOS
bundle result in `docs/AUDIO_QA.md`. Do not mark device rows complete without hardware.

- [ ] **Step 5: Perform available physical-device checks**

When an Android device or iPhone is connected, install a development/release build
and execute every row in `docs/AUDIO_QA.md`. Capture onset with a high-frame-rate
camera or loopback recording where available. The median press-to-audio onset target
is below 30 ms. Log model, OS, output route, median, maximum, and any audible clipping.

- [ ] **Step 6: Commit final verification evidence**

```bash
git add docs/UX_UI_SPEC.md docs/QA_ACCEPTANCE.md docs/AUDIO_QA.md e2e/browser/redesign.spec.ts artifacts/screenshots/redesign
git commit -m "test: verify physical keyboard audio experience"
```
