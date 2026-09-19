# Data Model

## 1. Core content model

Suggested conceptual entities.

### content_item

```text
id                TEXT PK
kind              WORD | SENTENCE
source_language   ko | en
target_language   en | ko
prompt             TEXT
canonical_answer   TEXT
difficulty         TEXT
category           TEXT
content_pack_id    TEXT
active             BOOLEAN
```

### accepted_answer

```text
id                TEXT PK
content_item_id    TEXT FK
answer             TEXT
normalized_answer  TEXT
priority            INTEGER
```

### content_pack

```text
id
version
schema_version
checksum
source_language
target_language
item_count
installed_at
```

## 2. User learning state

### mastery

```text
content_item_id   TEXT PK
stage             NEW | GUIDED | RECALL | SPEED | MASTERED
seen_count         INTEGER
correct_count      INTEGER
wrong_count        INTEGER
hint_count         INTEGER
best_time_ms       INTEGER NULL
mastery_score      INTEGER 0..100
last_seen_at       DATETIME NULL
next_review_at     DATETIME NULL
```

### answer_log

Keep compact logs needed for local analytics/debugging. Do not store unlimited verbose raw data forever.

```text
id
session_id
content_item_id
mode
result
response_time_ms
mistake_count
hint_used
rank
created_at
```

## 3. Sessions

### learning_session

```text
id
mode
started_at
ended_at
items_presented
items_correct
xp_earned
tokens_earned
```

## 4. Progression/economy

### user_profile

```text
local_user_id
level
xp
token_balance
selected_keyboard_theme_id
created_at
```

### economy_ledger

```text
id
reason
amount
balance_after
reference_id NULL
created_at
```

Use a ledger for token changes so economy bugs are diagnosable.

### keyboard_inventory

```text
keyboard_theme_id
unlocked_at
source
```

## 5. Habit

### daily_progress

```text
date
active_study_seconds
goal_seconds
goal_completed
```

### streak_state

```text
current_streak
longest_streak
last_completed_date
streak_freeze_count
```

### reminder_setting

```text
enabled
days_of_week
local_hour
local_minute
```

## 6. App settings

### app_setting

Persist at minimum:

- UI language
- study direction
- sound enabled
- sound volume
- haptics enabled
- reduced-effects preference if app-specific
- onboarding/tutorial completion

## 7. Normalization

For answer matching:

- trim surrounding whitespace where appropriate,
- normalize Unicode to NFC,
- apply language-appropriate case behavior for English,
- preserve punctuation rules defined per content item,
- never apply aggressive normalization that changes lexical identity.

For Korean live-prefix comparison, decomposed Jamo representation may be used internally.

## 8. Seed content

Ship a manually reviewed seed dataset sufficient to exercise all modes.

Suggested engineering seed:

- 300-500 word items,
- 100-200 short sentence items,
- both KO->EN and EN->KO directions,
- multiple accepted-answer examples,
- edge cases for Korean composition.

Do not fabricate thousands of production items solely to hit a count target.
