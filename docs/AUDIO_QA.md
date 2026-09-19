# Physical keyboard audio QA

Date: 2026-09-20

## Automated evidence

The committed asset validator checks that every WAV has complete source/output
provenance and matching SHA-256, mono PCM WAV at
48 kHz/16-bit, leading silence, peak level, duration and required categories.
The browser credit flow rejects external requests. Android/iOS export proves that
Metro can bundle the assets; it does not prove physical-device latency or sound.

| Check | Result |
| --- | --- |
| TypeScript | Passed, `tsc --noEmit` |
| ESLint | Passed, 0 errors and 0 warnings |
| Unit tests | 13 suites, 141 tests passed |
| Native component tests | 5 suites, 21 tests passed |
| Audio asset validation | 7 physical packs passed; 1 declared legacy theme |
| Playwright | 32 browser tests passed, including 8 redesign/audio flows |
| Expo doctor | 18/18 checks passed |
| Web export | Passed; 110 assets and the web bundle exported |
| Android/iOS export | Passed; both Hermes bundles and 125 assets exported |

## Physical-device protocol

Use a development or release build. Test each row with normal taps, a rapid burst,
Space, Backspace and a three-key glide. Confirm press and release are distinct,
mute is immediate, returning from the background does not lose audio, and no clip
or pop is audible. Measure press-to-audio onset with high-frame-rate video or audio
loopback where available. Target median onset: less than 30 ms.

| Status | Platform/device | OS | Output | Theme | Press | Release | Space | Backspace | 3-key glide | Mute | Resume | Median onset | Max onset | Clipping/notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| [ ] | Android phone | — | Built-in speaker | Brown Tactile | — | — | — | — | — | — | — | — | — | Not run; no device attached and `adb` unavailable |
| [ ] | Android phone | — | Headphones | Blue Click | — | — | — | — | — | — | — | — | — | Not run; no device attached |
| [ ] | iPhone | — | Built-in speaker | Cream Linear | — | — | — | — | — | — | — | — | — | Not run; no device attached |
| [ ] | iPhone | — | Headphones | Deep Thock | — | — | — | — | — | — | — | — | — | Not run; no device attached |

Add rows for Buckling Spring, Airy Linear and Heavy Linear during the same device
session. Keep every status unchecked until the named hardware and output path have
actually been tested.
