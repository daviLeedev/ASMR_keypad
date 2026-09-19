# Analytics Spec

## Principles

- Track product behavior, not sensitive typed content.
- Do not send raw user-entered answer text to analytics.
- Send content IDs, mode, result metrics, and timing.

## Minimum events

```text
app_open
onboarding_started
ui_language_selected
study_language_selected
onboarding_completed
first_key_pressed
micro_tutorial_completed

lesson_started
answer_completed
lesson_completed

review_started
review_completed
speed_started
speed_completed
word_rain_started
word_rain_completed

daily_goal_completed
streak_milestone

keyboard_previewed
keyboard_unlocked
keyboard_equipped

rewarded_ad_offered
rewarded_ad_completed
rewarded_ad_failed

purchase_started
purchase_completed
purchase_failed

notification_permission_result
notification_scheduled
notification_opened
```

## Key funnels

1. Install -> first key press
2. First key press -> tutorial completed
3. Tutorial completed -> second session
4. Guided -> Recall progression
5. Recall -> Speed/Word Rain usage
6. First Token earn -> first keyboard unlock
7. Reminder opt-in -> next-day return
