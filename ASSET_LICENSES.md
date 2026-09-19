# Asset provenance

All 64 keyboard WAV samples in `assets/audio/` are original procedural sound designs created for KeyLingo. They contain no third-party recordings, musical samples, dictionary audio, or voice content. Source synthesis is reproducible with `node scripts/generate-audio.cjs`.

The repository author dedicates these generated sound assets and the synthesis script to the public domain under CC0 1.0 Universal, to the extent legally possible: https://creativecommons.org/publicdomain/zero/1.0/ . Attribution is appreciated but not required.

Each of the eight themes includes four normal-key variants, two spacebar variants, enter, and backspace. Audio format: mono PCM, 44.1 kHz, 16 bit, 190 ms. The Silent theme is deliberately soft, while the Sound toggle is fully muted. No sounds play before a user interaction.

These are synthesized keyboard-inspired effects, not recordings of a particular commercial keyboard or switch. Physical-device listening, perceived latency, clipping, overlap at high typing speeds, silent-switch expectations, and accessibility haptic checks remain release QA requirements.

App symbols use text and simple code-drawn shapes. Font assets, if added, must have their provenance recorded here before release. Content licensing is documented separately in `content/`.
