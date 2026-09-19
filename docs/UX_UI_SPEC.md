# UX / UI Spec — Soft Tech / Premium Keyboard redesign

## 0. Information architecture (2026-09-19)

This revision supersedes the old flat Home shortcuts in PRODUCT_SPEC.md. Product,
learning, economy and offline rules remain unchanged. The product is a premium
typing playground: the keyboard is the hero, language learning is the purpose.

### Route hierarchy

- `/home`: one recommended next session, equipped keyboard identity, compact daily rhythm.
- `/play`: choose learning or arcade; no gameplay starts accidentally from a category.
  - `/learn`: choose words/sentences and Guided/Recall; explain unavailable Recall.
  - `/arcade`: choose Speed/Word Rain; explain eligibility and offer learning when empty.
  - `/practice?mode=…&kind=…`: dedicated full-screen gameplay with no tab bar.
  - `/result`: dedicated session result with retry, Home, and collection discovery.
- `/collection`: full-width keyboard gallery, All/Mine filters, owned/equipped/locked labels.
  - `/keyboard/[id]`: product identity, interactive sound/typing trial, price and level,
    equip/unlock action. Preview never spends tokens or changes equipped theme.
- `/progress`: actual daily goal, streak, level, recent sessions; no invented statistics.
  - `/settings`: audio, language, habit/reminders and purchase settings.

Home, Play, Keyboards and Progress have a persistent bottom navigation outside the
scroll view. Child screens use a back control with an explicit parent fallback for
direct links. Settings is secondary, available from the shell header and Progress.
Tutorial remains language selection → immediate typing → reward → collection → Home.
Existing practice URLs and reminder deep links remain supported.

Tab destinations reuse existing routes. Result → Home dismisses completed child
screens so the back action does not reopen a completed result.

### Screen hierarchy and art direction

Home answers only “What should I do now?”: one large editorial headline, a tactile
illustration of the equipped keyboard, and one primary Start action. Recommend due
Recall words in the active study language, otherwise Guided words. No mode list,
word/sentence toggle or shop grid on Home. Daily progress is a compact rail, not a
large dashboard card. Keyboard identification links to its detail.

Play presents two distinct destinations, Learning and Arcade. Choices of format and
mode belong to their respective child screens. Locked modes stay discoverable with
clear reasons and an actionable learning path; they never launch an empty game.

Collection uses full-width product exhibits, generous neutral space and miniature
physical keyboard compositions with side walls/keycap depth. No two-column color
picker. Each exhibit names the keyboard, its tactile character and ownership state.
Detail provides the real interactive keyboard, explicit sound/mute state, and one
purchase/equip action. Insufficient balance and level requirements are stated before
purchase; the existing economy service remains authoritative.

Use roughly 70% neutral/white, 20% sky, 10% accents. Sky is reserved for focus,
progress and small accents; large pale-blue containers and decorative gradients are
not the visual foundation. Use system typography, navy headlines, quiet captions,
thin separators, restrained rounding and no emoji navigation. Decorative product
renders are noninteractive and hidden from accessibility; actual keyboards retain
their accessible keys. Minimum shell control height: 44dp.

The light brand palette remains the surface/accent reference. Existing darker
foreground variants (primaryStrong #267FC4, success #208566, error #C54050) are
retained for legibility on white; do not use light accent fills as small text.

### Motion and icon refinement

Use matching 24-unit vector icons with rounded 1.7-unit strokes throughout shell
navigation, settings, back controls and destinations. Active tabs have a compact
sky pill behind the icon. Native top-level routes fade, details slide from the
right, and results fade upward. Web shell content uses a 180–240ms entrance with
the bottom navigation stationary. Buttons compress gently over 80ms and recover
over 160ms. App and OS reduced-motion preferences disable positional motion;
native route animation is disabled as well. Progress uses a contained daily-goal
summary and an illustrated, actionable empty state with real stored data.

### Verification for this revision

Validate both interface languages at 375×667, 390×844 and 430×932: visible primary
Home action and fixed tabs, no horizontal overflow, gallery/detail back navigation,
All/Mine empty states, insufficient-token/level states, persisted equip selection,
learning and arcade eligibility, tutorial→collection→Home, offline mode and result
retry. Gameplay retains no-scroll prompt/answer/keyboard fit. Keep recent glide touch
work. Physical-device sound latency, multi-touch and native signing remain release
checks; browser rendering cannot certify them.

## 1. Visual direction

Theme: **Soft Tech / Premium Keyboard**

Aesthetic blend:

- clean productivity app,
- premium mechanical-keyboard hobby product,
- restrained game feedback.

Avoid:

- childish mascots as the dominant visual language,
- excessive gradients,
- neon-everywhere gaming UI,
- emoji as primary UI icons,
- huge permanent banners,
- dense card dashboards.

## 2. Color tokens

Suggested starting tokens:

```text
background       #F7FBFF
surface          #FFFFFF
primary          #61B9FF
primaryStrong    #3C9CEA
navy             #153975
textSecondary    #6B7992
border           #D5E5F5
success          #3ABF8F
reward           #FFC640
error            #FF7474
```

Use neutrals + sky blue for the shell. Keyboard theme palettes may vary inside the keyboard/preview area.

## 3. Typography

For MVP, prefer platform/system fonts to avoid cross-platform font-rendering and packaging failures.

Requirements:

- Korean glyphs must render correctly on both iOS and Android.
- Do not rely on an unbundled custom font.
- If a custom font is later bundled, verify license and render it on real devices before release.

## 4. First-run UX

No title-only splash after the OS splash.
No feature tour.
No terms wall unless legally required.
No login.

Screen A: UI language

- Detect device language.
- Preselect best supported language.
- One primary confirmation action.

Screen B: Study language

- show supported options clearly,
- immediately launch tutorial after selection.

Tutorial:

- 3 items,
- first two Guided,
- third Recall,
- first key may subtly pulse before interaction,
- do not show a paragraph explaining how to type.

## 5. Gameplay layout

Portrait-only in MVP.

Small-screen hard requirement:

On 375x667-class screen, the following must be visible simultaneously without vertical scrolling:

- progress/status strip,
- prompt,
- current input / ghost region,
- virtual keyboard.

Target keyboard vertical share: 35-42% of available content height.

## 6. Guided ghost text

The ghost target is a signature interaction.

Rendering behavior:

- typed portion: strong foreground text,
- untyped target suffix: low-contrast ghost text,
- wrong current input state: restrained error emphasis,
- avoid large shake animations.

Example conceptual colors:

- typed: navy
- ghost: light gray-blue
- error: error token

## 7. Recall

Do not render the target answer before submission.

Optional hint action should be visually secondary.

A hint may reveal a controlled prefix or clue, not the full answer by default.

## 8. Speed

Speed mode may increase game intensity through:

- timer,
- combo,
- rank feedback,
- short transition between items.

Do not navigate to a new page after each word. Keep the flow continuous.

## 9. Word Rain

Vertical composition:

```text
score / timer / combo
falling-word area
fail line / current typed text
virtual keyboard
```

The keyboard itself acts as the visual floor.

Use simple prompt chips/cards with strong readability. Avoid particle overload in MVP.

## 10. Virtual keyboard

MVP layouts:

- EN QWERTY
- KO Dubeolsik QWERTY

Rows may adapt by context:

### Word

- alphabet/jamo rows,
- backspace,
- no unnecessary space/enter row if auto-submit is used.

### Sentence

- include Space,
- include Backspace,
- Enter only if interaction requires it.

Key behavior:

- visual press begins on press-in,
- sound begins on press-in when technically reliable,
- haptic is short and light by default,
- visible keycap may be smaller than touch hitbox,
- touch targets should remain approximately 44dp where practical.

### Tactile dock baseline

- Use code-native layers instead of per-key raster images: switch recess, key side, and key top.
- Phone side inset: 8px; keyboard width must remain at least 94% of a 320–480px viewport.
- Wide-screen maximum width: 560px, centered.
- Key top height: 42px; never reduce below 39px.
- Column gap: 3px; row gap: 8px; second-row horizontal inset: 8px.
- Key travel: 7px. Press timing: 70ms. Release timing: 105ms.
- The deck side is 13px and continues through the device bottom safe area in the same color.
- Keep at most three feedback labels. Remove each after 520ms. Speed and Rain use `+1`; calm practice uses the pressed legend.
- Reduced Motion preserves input and the pressed color state while disabling translation, scale, and popup feedback.
- Disabled practice states must suppress input, sound, haptic feedback, and new popup events.

### Physical keyboard audio identity

The keyboard is a two-phase instrument. Press-in plays a real switch-down sample,
enters the character and fires one haptic. Press-out or cancellation plays the
matching switch-up sample. Crossing a key boundary while gliding releases the old
key before pressing the new key; ending the gesture releases the final key. Each
finger owns its own lifecycle. Audio errors never block text input.

Normal keys draw from a non-repeating shuffle bag and use overlapping preloaded
voices. Space, Enter and Backspace use their own recordings so stabilizer character
is preserved. Only the selected theme is preloaded. Missing release audio stays
silent instead of borrowing from another theme. Sound mute, volume and haptic
preferences remain independent; Reduced Motion does not disable sound.

Collection detail identifies the recording family and three audible traits:
Brown Tactile, Blue Click, Cream Linear, Deep Thock, Buckling Spring, Quiet Cloud,
Airy Linear and Heavy Linear. Seven themes ship validated MIT physical recordings.
Quiet Cloud remains the clearly disclosed legacy generated pack until a cleared
damped source is available. Settings links to bundled, offline audio credits.

## 11. Collection UX

Collection should feel like a product showroom, not a noisy shop grid.

The gallery opens a dedicated `/keyboard/[id]` detail. In that detail show:

- large preview,
- theme name,
- tactile descriptors such as Clicky / Creamy / Deep / Silent,
- unlock condition,
- Try/Preview interaction.

Locked themes should still be visible enough to create desire.

## 12. Feedback hierarchy

Routine feedback: calm.

- subtle correctness,
- small XP/token labels,
- limited motion.

Big achievements:

- level up,
- new keyboard unlock,
- personal best,
- milestone streak.

These may use stronger but still polished animation.

## 13. Accessibility

- adequate color contrast,
- never communicate state by color alone,
- screen-reader labels for all functional controls,
- sound-independent gameplay,
- haptic-independent gameplay,
- respect reduced motion,
- no essential hover interactions.
