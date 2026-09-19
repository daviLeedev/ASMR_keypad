# Product Spec

## Product promise

KeyLingo turns language study into tactile typing play.

The user should feel three loops at the same time:

1. **Learn**: I remember more words/sentences.
2. **Skill**: I can retrieve and type them faster.
3. **Collect**: I unlock keyboards that feel and sound different.

## Primary target users

### A. Korean user learning English

Needs:
- vocabulary repetition,
- short sessions,
- less boring practice,
- measurable speed/accuracy feedback.

### B. English-speaking user learning Korean

Needs:
- Korean word recall,
- Dubeolsik keyboard familiarity,
- visible Hangul composition feedback,
- short repeated practice.

### C. Secondary psychographic target

Users who enjoy:
- mechanical keyboards,
- typing sound,
- ASMR,
- collecting cosmetic variants,
- short score-attack games.

## First-run experience

No intro carousel.
No account wall.
No notification permission wall.

Flow:

1. UI language confirmation.
2. Study language selection.
3. Immediate 3-item typing tutorial.
4. First reward.
5. Keyboard collection/sound teaser.
6. Home.
7. Daily-goal setup later.
8. Reminder permission only after explicit schedule action.

## Home information hierarchy

Priority order:

1. Continue today's learning.
2. Daily Goal progress.
3. Review due count.
4. Streak / level.
5. Speed / Word Rain shortcuts.
6. Collection.

Do not overload Home with events, banners, or shop promotions in MVP.

## Core modes

### Learn (Guided)

- meaning + ghost target,
- user types over ghost target,
- no pressure,
- low economy reward,
- learning-stage progression.

### Review (Recall)

- meaning only,
- target hidden,
- optional hint,
- mastery-focused.

### Speed

- recall under time pressure,
- rank + personal best,
- higher XP/token session reward.

### Word Rain

- falling prompt cards,
- target typed from memory,
- 60-second score attack,
- primarily review content.

## Sentence typing

Short sentences are supported.

Guided sentence mode may expose the target sentence as ghost text.
Recall sentence mode should treat the learned canonical sentence as the expected target, with accepted variations only when explicitly encoded in content data.

Do not attempt free-form translation grading in MVP.

## Developer content

The architecture may support a future Developer/Code Typing pack, but it must not block core MVP delivery. A small demo seed is acceptable only after all P0 core flows pass.
