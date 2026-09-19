# KeyLingo E2E MASTER SPEC v2

> Status: MVP Source of Truth
> Product: KeyLingo (working title)
> Platforms: iOS / Android
> Orientation: Portrait-first
> Primary principle: **Typing itself is the game.**

## 1. Product definition

KeyLingo is a mobile language-learning typing game that combines:

- language learning,
- direct typing practice,
- keyboard ASMR sound and haptics,
- cosmetic keyboard collection,
- short arcade modes,
- daily study habit formation.

The MVP supports two learning directions:

1. Korean UI user learning English: `KO -> EN`
2. English UI user learning Korean: `EN -> KO`

The app must feel like a polished typing game first, while still producing a credible learning loop.

## 2. Non-negotiable product principles

1. The first typing interaction must happen before any long explanation, feature tour, account creation, or permission request.
2. No intro slides or marketing carousel on first launch.
3. The first-session hook is tactile: key press animation + ASMR sound + haptic feedback.
4. Guided copying and real recall must be separate learning stages.
5. Recall, Speed, and Word Rain must not reveal the answer spelling before the user submits or explicitly requests a hint.
6. Core gameplay must work offline.
7. Keyboard themes are cosmetic/tactile, never stat boosts.
8. Rewarded ads are optional accelerators, never required to progress.
9. No login is required for the MVP.
10. Core gameplay uses an in-app virtual keyboard, not the OS keyboard.
11. English uses compact QWERTY. Korean uses compact Dubeolsik QWERTY. Chunjiin/3x4 layouts are post-MVP.
12. The core learning screens must work without vertical scrolling on a 375x667 logical-pixel class device.

## 3. First launch: Cold Open Tutorial

### 3.1 Goal

The user should understand the app by touching it, not by reading a manual.

Target:

- Time to first keystroke: <= 10 seconds in the normal first-run path.
- Required taps before first keystroke: ideally <= 2.

### 3.2 Flow

1. Detect device/system language.
2. Ask which UI language to use, with the detected language preselected.
3. Ask which language to study.
4. Immediately open the virtual keyboard and start a 3-item micro tutorial.
5. First two items use Guided/Ghost Typing.
6. Third item uses Recall with no full answer shown.
7. Show first result/reward.
8. Briefly expose keyboard collection / sound preview.
9. Enter Home.
10. Ask for Daily Goal and notification scheduling only after the user has experienced the core loop.

Do **not** request notification permission on app launch.

### 3.3 First key interaction

On first key `pressIn`, synchronously trigger as closely as possible:

- visual key depression,
- sound sample playback,
- light haptic,
- typed-character feedback replacing the corresponding ghost character.

No automatic sound should play before the user touches a key.

## 4. Learning progression

Use the following conceptual stages:

```ts
type LearningStage =
  | 'NEW'
  | 'GUIDED'
  | 'RECALL'
  | 'SPEED'
  | 'MASTERED';
```

### 4.1 Guided / Learn

Purpose: build the connection between meaning, spelling, and finger movement.

Example for KO -> EN:

- Prompt: `사과`
- Target ghost: `apple`
- Typed portion is rendered in normal foreground color.
- Remaining target stays as low-contrast ghost text.

Rules:

- Full target is visible as ghost text.
- No time pressure.
- Lower progression/economy rewards than Recall or Speed.
- Guided-only items must not enter Word Rain.

### 4.2 Recall / Review

Purpose: actual retrieval practice.

Example:

- Prompt: `사과`
- Input: blank.
- Expected answer: `apple`.

Rules:

- Do not reveal target spelling initially.
- Optional hint may reveal a partial prefix or limited clue.
- Using a hint lowers reward and mastery gain.
- Wrong answers reveal the answer after submission and schedule earlier review.

### 4.3 Speed

Purpose: convert recall into automaticity.

Rules:

- Only items with adequate prior exposure may appear.
- Prompt meaning is visible, answer is not.
- Measure response time for words.
- Measure WPM + accuracy for sentences.
- Award rank, XP, and session token bonuses.
- Personal best may be stored.

### 4.4 Word Rain

Purpose: arcade-style spaced review.

Rules:

- Falling items display the prompt language only.
- User types the target language from memory.
- No answer spelling is exposed.
- Eligible stages: RECALL, SPEED, MASTERED.
- GUIDED-only items are excluded.
- MVP uses 60-second score attack.
- Max simultaneous falling objects: 8.
- If two visible objects share the same accepted answer, remove the one closest to the fail line.

## 5. Virtual keyboard

### 5.1 Layouts

MVP:

- English: compact `EN_QWERTY`
- Korean: compact `KO_DUBEOLSIK`

Post-MVP:

- Chunjiin / Korean 3x4
- other regional layouts

### 5.2 Context-adaptive rows

For single-word mode, hide unnecessary keys when practical:

- no number row,
- no emoji,
- no microphone,
- no suggestion row,
- Enter may be omitted if answers auto-submit when complete,
- Space may be hidden for single-word items and shown for sentence mode.

### 5.3 Screen share

The virtual keyboard is a hero UI element, not an accessory.

Target keyboard height in portrait gameplay: approximately 35-42% of available content height, while still keeping prompt and answer feedback visible without scrolling on small devices.

## 6. Korean composition

Implement a reliable Dubeolsik Hangul composer supporting:

- initial consonant,
- medial vowel,
- final consonant,
- compound vowels,
- compound final consonants,
- backspace through composition states,
- Unicode normalization.

Use NFC normalization for final answer comparison. For live-prefix error detection, comparing decomposed Jamo sequences is acceptable.

## 7. Keyboard themes

MVP target: 8-12 keyboard sets.

Example themes:

- Starter
- Clicky Blue
- Creamy
- Deep Thock
- Retro
- Silent
- Sky 65
- Midnight

Each theme may define:

```ts
interface KeyboardTheme {
  id: string;
  name: string;
  palette: KeyboardPalette;
  soundPackId: string;
  keycapStyle: string;
  pressAnimationProfile: string;
  hapticProfile: string;
  unlockLevel: number;
  tokenCost: number;
}
```

Themes change visuals, audio, and haptic feel only. No gameplay stats.

## 8. Audio and haptics

Audio is a P0 quality area.

A sound pack should support multiple variants for normal keys to reduce repetition:

- normal_01..04
- space_01..02
- enter
- backspace

Requirements:

- preload active theme samples,
- allow overlapping rapid playback,
- minimize perceived input-to-sound latency,
- start sound on press-in where feasible,
- expose Sound On/Off and volume,
- expose Haptic On/Off,
- respect platform capabilities gracefully.

Physical-device listening is still required before release.

## 9. Progression and economy

Currencies:

- XP for level progression.
- Token as the single spendable soft currency.

Token sources:

- completed learning sessions,
- high-rank Speed results,
- Word Rain session result,
- Daily Goal,
- streak milestones,
- level-up rewards,
- optional Rewarded Ad.

Token spend:

- keyboard theme unlocks.

Do not make per-keystroke or per-word token generation exploitable. Prefer session rewards.

Suggested initial keyboard pricing range: 300-1500 Token. All values must be configurable, not hardcoded into feature logic.

## 10. Daily habit loop

Support:

- daily study goal: 5 / 10 / 20 minutes,
- streak,
- optional Streak Freeze,
- local reminder schedule,
- notification deep link to today's practice.

Progressive onboarding:

- do not ask for Daily Goal before the user experiences the tutorial unless needed for layout testing,
- request notification permission only when the user explicitly chooses to schedule reminders.

## 11. Monetization

MVP:

1. Rewarded Ads only. No forced interstitials.
2. Starter Pack IAP.
3. Production adapters for AdMob / RevenueCat, with functional mocks if credentials are absent.

Suggested Rewarded Ad limit: 3/day, configurable.

No subscription in MVP.
No gacha.
No loot boxes.
No pay-to-win.

Store prices must come from the store SDK; never hardcode local prices in UI.

## 12. Data/content principles

Core entities:

- content item,
- prompt,
- accepted answers,
- difficulty,
- category,
- learning stage,
- mastery,
- session,
- answer log,
- content pack.

Production-scale target may eventually include thousands of items, but the repository should ship with a verified seed dataset and an import/validation pipeline rather than fabricated bulk content.

Do not scrape license-unclear commercial dictionaries.
Document content and asset licenses.

## 13. Local-first behavior

Core flows must work without network:

- app boot,
- onboarding after initial install,
- guided learning,
- recall,
- speed,
- word rain,
- progression,
- collection,
- daily goal,
- streak.

Remote services may enhance:

- content manifests,
- content pack download,
- remote config,
- future cloud save.

## 14. UI direction

Theme concept: **Calm Typing Playground / Soft Tech + Premium Keyboard**.

The app shell stays consistent:

- white / near-white background,
- sky blue primary,
- deep navy text,
- soft gray secondary text,
- restrained green/gold/red semantic accents.

Keyboard themes may be visually expressive without recoloring the entire app shell.

Do not make the UI childish or overly game-like.

## 15. MVP out of scope

Do not add these unless explicitly requested later:

- real-time PvP,
- social feed,
- chat/friends,
- voice recognition,
- AI conversation,
- system keyboard extension,
- full global ranking,
- season pass,
- gacha,
- 10-language launch,
- keyboard-part builder,
- Chunjiin/3x4 keyboard,
- long-form writing mode.

## 16. Completion rule

Implementation is complete only when the acceptance criteria in `docs/QA_ACCEPTANCE.md` pass or an item is explicitly documented as an external credential/device blocker.
