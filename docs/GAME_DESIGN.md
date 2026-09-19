# Game Design Spec

## 1. Core loop

```text
Reminder / Home
    -> Guided / Recall learning
    -> Speed or Word Rain
    -> XP + Token + Mastery
    -> Level / Keyboard unlock
    -> New sound / haptic / visual feel
    -> Return tomorrow
```

## 2. Learning stage transitions

Initial tuning hypothesis (must be configuration-driven):

```text
NEW
 -> 1 successful Guided exposure
GUIDED
 -> 2 successful Recall attempts
RECALL
 -> 3 clean Recall successes + minimum mastery threshold
SPEED
 -> repeated high-rank performance across separated sessions/dates
MASTERED
 -> scheduled long-interval recall checks
```

Do not mark an item permanently mastered from a single-session grind.

## 3. Mastery model

Suggested storage:

```ts
interface MasteryRecord {
  contentItemId: string;
  stage: LearningStage;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  hintCount: number;
  bestTimeMs?: number;
  masteryScore: number; // 0..100
  lastSeenAt?: string;
  nextReviewAt?: string;
}
```

Suggested review intervals (configurable):

- 0-24: same day
- 25-49: +1 day
- 50-74: +3 days
- 75-89: +7 days
- 90+: +14 days

## 4. Accuracy

Track error transitions rather than punishing Backspace itself.

Conceptual approach:

```text
if normalizedCurrentInput is no longer a valid prefix
of any accepted normalized answer
and this invalid state was not already counted:
    mistakeCount += 1
```

For Korean, live comparison may use decomposed Jamo sequences.

Clamp displayed accuracy to 0..100.

## 5. Word scoring

All constants must live in tuning config.

Conceptual expected time:

```text
expectedTimeMs = baseTimeMs + expectedKeystrokes * perKeyTimeMs
```

Initial hypothesis:

- baseTimeMs: 700
- perKeyTimeMs: 280

Rank example:

- S+: <= 0.65x expected and 100% accuracy
- S: <= 0.85x
- A: <= 1.10x
- B: <= 1.40x
- C: correct completion

These are tuning defaults, not immutable rules.

## 6. Sentence scoring

Track:

- WPM,
- accuracy,
- mistakes,
- completion time,
- combo contribution.

## 7. Combo

Perfect answer definition:

- no counted mistake,
- no hint,
- correct completion.

Perfect:
- combo +1.

Wrong / timeout:
- combo reset.

Use milestones (5/10/20/50) for restrained visual feedback.

## 8. Reward philosophy

Guided should teach, not farm currency.

Relative reward ordering:

```text
Guided < Recall < Speed / strong Word Rain performance
```

Token awards should be session-oriented.

Example session values (tuning hypothesis):

- Guided lesson completion: XP, 0-2 Token
- Recall session: 5 Token base
- Speed session: 5-10 Token based on performance
- Word Rain: score-tier reward
- Daily Goal: 20 Token
- Rewarded Ad: +10 Token, limited daily

## 9. Word Rain

MVP format: 60-second score attack.

Falling item:

```ts
interface FallingWord {
  instanceId: string;
  contentItemId: string;
  prompt: string;
  acceptedAnswers: string[];
  normalizedAcceptedAnswers: string[];
  y: number;
  fallSpeed: number;
  difficulty: number;
}
```

Difficulty may scale through:

- spawn interval,
- fall speed,
- word length,
- simultaneous object count,
- lower-mastery content weighting.

Failing an item resets combo. MVP does not require a life system.

## 10. Fairness

Keyboard themes do not alter:

- scoring,
- spawn speed,
- XP gain,
- token gain,
- mastery gain.
