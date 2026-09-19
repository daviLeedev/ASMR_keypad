# Technical Architecture

## 1. Core stack

Application:

- React Native
- Expo
- TypeScript strict mode
- Expo Router

State:

- Zustand for local app/game state
- TanStack Query for remote/cacheable server data

Persistence:

- Expo SQLite
- Drizzle ORM
- Zod for runtime schemas and content-pack validation

Motion:

- React Native Reanimated
- React Native Skia only if profiling proves it is needed

Device:

- expo-audio
- expo-haptics
- expo-notifications

Localization:

- i18next
- react-i18next

Backend:

- Supabase PostgreSQL / Storage
- keep core app playable without Supabase

Monetization:

- RevenueCat production adapter
- Google Mobile Ads rewarded-ad production adapter
- working dev mocks when credentials are unavailable

Observability:

- PostHog
- Sentry

Testing:

- Jest
- React Native Testing Library
- Maestro for E2E

Delivery:

- GitHub Actions
- EAS Build
- EAS Submit

Use mutually compatible current stable package versions and lock exact versions in the lockfile. Do not blindly install incompatible latest versions.

## 2. Repository structure

Recommended:

```text
keylingo/
├── app/
│   ├── _layout.tsx
│   ├── onboarding/
│   ├── home/
│   ├── learn/
│   ├── review/
│   ├── speed/
│   ├── word-rain/
│   ├── collection/
│   ├── result/
│   └── settings/
├── src/
│   ├── features/
│   │   ├── typing/
│   │   ├── virtual-keyboard/
│   │   ├── korean-composer/
│   │   ├── learning/
│   │   ├── review/
│   │   ├── speed/
│   │   ├── word-rain/
│   │   ├── progression/
│   │   ├── economy/
│   │   ├── collection/
│   │   ├── streak/
│   │   ├── notifications/
│   │   └── monetization/
│   ├── domain/
│   ├── db/
│   ├── audio/
│   ├── haptics/
│   ├── analytics/
│   ├── localization/
│   ├── design-system/
│   └── utils/
├── content/
├── assets/
├── supabase/
├── e2e/
├── tests/
└── docs/
```

## 3. Architecture boundaries

### Domain logic must be testable without React Native UI

Keep these as mostly pure logic/modules:

- answer normalization,
- accepted-answer matching,
- Hangul composition,
- scoring,
- combo,
- mastery progression,
- review scheduling,
- economy rules,
- Word Rain target matching.

### Provider adapters

External services must sit behind interfaces.

Examples:

```ts
interface RewardedAdProvider {
  isAvailable(): Promise<boolean>;
  showRewardedAd(): Promise<'rewarded' | 'closed' | 'failed'>;
}

interface PurchaseProvider {
  loadOfferings(): Promise<Offering[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
}
```

Mocks must let the complete flow run in development.

## 4. Local-first

SQLite is the primary source of truth for local progress.

Network loss must not prevent core gameplay.

Remote services may update content or configuration but must fail soft.

## 5. Audio architecture

Preload the active theme sound pack.

Audio manager responsibilities:

- sample preload/unload,
- small pool of overlapping players if required,
- key category routing,
- random normal-key sample selection,
- volume/mute,
- failure fallback.

Do not perform expensive disk reads for every key press.

## 6. Virtual keyboard architecture

Suggested separation:

```text
KeyboardLayout
  -> renders rows / key definitions
VirtualKeyboardController
  -> converts touches into KeyAction
TypingEngine
  -> updates logical typed state
KoreanComposer
  -> composes/decomposes Korean where applicable
AudioEngine / Haptics
  -> tactile feedback
AnswerMatcher
  -> correctness / prefix state
```

Do not couple key visuals directly to SQLite or learning-stage logic.

## 7. Orientation

MVP gameplay and shell are portrait-only.

Landscape is not required.

## 8. Build and environment

Provide:

- `.env.example`
- `app.config.ts`
- `eas.json`
- dev / preview / production build profiles
- no real secrets committed

If iOS signing credentials are unavailable, still make the project build-ready and document the exact external blocker rather than claiming success.
