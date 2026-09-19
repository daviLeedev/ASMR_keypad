# UX / UI Spec

## 1. Visual direction

Theme: **Calm Typing Playground**

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

## 11. Collection UX

Collection should feel like a product showroom, not a noisy shop grid.

For a selected keyboard show:

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
