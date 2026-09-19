# KeyLingo physical keyboard audio design

Date: 2026-09-19

## Goal

Replace the current synthesized one-shot effects with a low-latency, multisampled
keyboard instrument. Pressing, holding, releasing, and gliding across the virtual
keyboard should sound like physical switches moving inside complete keyboards.
Audio remains cosmetic: it must never delay or change learning input, scoring, or
economy behavior.

Success means that repeated typing does not produce the obvious “same effect”
machine-gun sound, switch families have recognizably different characters, and a
key release contributes to the rhythm. The app must work fully offline after
installation.

## Chosen source strategy

Use real, permissively licensed multisamples. Do not use ElevenLabs free output in
the shipping app because its free tier does not grant commercial use. Do not use
AI-generated effects for the core keyboard packs in this revision.

Primary source:

- kbsim/MechVibes-derived recordings distributed under MIT, using the upstream
  press/release samples and dedicated Space, Enter, and Backspace recordings where
  available. Import only selected audio assets, their original license, and their
  credits; do not copy application code. Reference repositories:
  `https://github.com/cjlangan/MechSim` and
  `https://github.com/hainguyents13/mechvibes`.

Secondary source:

- The CC0 OpenGameArt “Keyboard Soundpack #1” for missing physical-key variations
  and validation references. Do not mix it into a named switch profile when its
  keyboard character would make the label misleading. Source:
  `https://opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes`.

Pixabay, Mixkit, and Freesound are fallback search sources. A candidate is accepted
only when its individual license permits commercial app inclusion. Freesound
CC-BY-NC assets are excluded. Store the source page, author, original filename,
license, download date, and content hash for every imported asset.

## Sound identities

Keep all eight existing collection IDs and economy rules. Change only their audio
identity and descriptive copy where the existing name would misrepresent the sound.

| Theme ID | Audio identity | Source family | Character |
| --- | --- | --- | --- |
| `starter` | Brown Tactile | MX Brown | balanced, restrained tactile knock |
| `clicky` | Blue Click | MX Blue or Box Navy | bright down/up click with short body |
| `creamy` | Cream Linear | NK Cream | rounded, smooth pop and clack |
| `thock` | Deep Thock | Holy Panda | low, resonant tactile impact |
| `retro` | Buckling Spring | Buckling Spring | metallic vintage snap and case ring |
| `silent` | Quiet Cloud | cleared silent/damped source | short padded down/up impact |
| `sky` | Airy Linear | Turquoise | clear, light linear pop |
| `midnight` | Heavy Linear | MX Black or Black Ink | low, compact, weighty clack |

If a legally cleared Quiet Cloud pack cannot be found, keep the current `silent`
audio temporarily and mark that one theme as legacy in provenance. Do not relabel a
Topre recording as silent. The other seven profiles can ship independently.

## Asset format and processing

Each pack contains:

- 6–8 normal-key press variants;
- 3–4 normal-key release variants;
- 2–3 press variants and 1–2 release variants for Space, Enter, and Backspace;
- optional modifier variants only when the source contains a genuine recording.

Use mono PCM WAV at 48 kHz and 16-bit for predictable native decoding. Trim leading
silence to at most 3 ms. Keep press clips approximately 40–145 ms and release clips
approximately 25–110 ms; preserve a longer natural tail only for Retro resonance.
Remove DC offset and unusable room noise, add very short click-safe fades, and avoid
heavy denoising that makes transients watery. Normalize within a pack so normal-key
RMS varies by no more than 2 dB, with peaks at or below -3 dBFS. Space and Enter may
remain louder and lower because stabilizer and keycap size are part of their identity.

Processed files live under `assets/audio/<theme>/<phase>/`. Add
`assets/audio/THIRD_PARTY_NOTICES.md` and one `provenance.json` per theme containing
source, license, author, hashes, processing notes, and any required attribution.

## Runtime architecture

Replace the flat `SoundPack` map with a two-phase pack:

```ts
type KeyPhase = "press" | "release";
type SoundPack = Record<KeyPhase, Record<KeyCategory, readonly number[]>>;
```

`AudioEngine.trigger(phase, category, settings)` selects a variant from a shuffle
bag, avoiding immediate repetition until all variants in that category have played.
Each asset has a small voice pool so rapid typing overlaps instead of cutting off the
previous transient. Only the selected theme is preloaded. Theme switching unloads
all previous players after the new preload request wins the existing generation
race.

Key interaction sends events as follows:

- press-in: trigger press audio, input, visual key travel, and one haptic;
- press-out/cancel: trigger release audio and visual return;
- glide entering a key: release the previous key, then press the entered key;
- glide ending: release the final key;
- disabled/muted state: input rules remain as today; audio and haptic are suppressed.

Haptics occur on press only. Clicky and tactile packs may use a sharper supported
impact style; linear and silent packs use a light impact. Haptic failure remains
non-fatal.

Do not layer separate switch, case, and room players at runtime in this revision.
The recorded/baked press sample carries the board character. This limits concurrent
voices, memory, phase issues, and mobile latency while press/release still supplies
the missing physical motion.

## Performance and failure behavior

- Target press-to-audio onset below 30 ms on supported physical devices.
- Perform no file reads, decoding setup, or player construction inside a key event.
- Keep the active pack's decoded/player footprint bounded; preload only that pack.
- Audio errors never block a key event or surface as a gameplay error.
- If a release asset is missing, omit release audio for that category. Do not fall
  back to a mismatched theme or synthetic click.
- Continue working with the device muted, without haptics, and under reduced motion.
  Reduced motion does not disable audio.

## UI and product behavior

The keyboard detail studio remains the preview surface. It should identify the
switch family and three short traits, for example “Tactile · Rounded · Medium.” The
preview uses the same engine, volume, mute state, and assets as gameplay. Previewing
does not unlock or equip a theme.

Collection cards may name the switch family but must not claim an exact commercial
keyboard model unless the recording and license establish it. Add a credits/legal
entry in Settings that opens the bundled third-party notices.

## Validation

Add unit tests for press/release routing, shuffle-bag non-repetition, overlapping
voice pools, generation-race cleanup, mute/volume clamps, missing release samples,
and non-fatal player errors. Add native component tests for press-in/out and the
glide sequence `press A → release A → press B → release B`.

Add an asset validation script that fails on missing provenance, unsupported format,
leading silence over 3 ms, unsafe peaks, excessive duration, or missing required key
categories. Existing input, Korean composition, navigation, economy, and browser
tests must remain green.

Physical-device QA is required on at least one Android phone and one iPhone when
available. Check built-in speaker and headphones, normal and rapid typing, Space and
Backspace, glide across three keys, theme switching, mute, background/foreground
return, and perceived synchronization between key travel, haptic, and sound.

## Rollout

Implement and validate Brown Tactile first as the reference pack and engine proof.
Then import Blue Click, Cream Linear, Deep Thock, Retro, Airy Linear, and Heavy
Linear through the same processing pipeline. Add Quiet Cloud only with a correctly
licensed damped recording. Keep the legacy generated files until every theme points
to a validated replacement, then remove only files with no references.
