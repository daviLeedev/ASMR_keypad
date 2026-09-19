export type AnalyticsProperties = Record<string, string | number | boolean>;
export interface AnalyticsAdapter {
  capture(event: string, properties: AnalyticsProperties): void | Promise<void>;
}
const events = new Set([
  "app_open",
  "onboarding_started",
  "ui_language_selected",
  "study_language_selected",
  "onboarding_completed",
  "first_key_pressed",
  "micro_tutorial_completed",
  "lesson_started",
  "answer_completed",
  "lesson_completed",
  "review_started",
  "review_completed",
  "speed_started",
  "speed_completed",
  "word_rain_started",
  "word_rain_completed",
  "daily_goal_completed",
  "streak_milestone",
  "keyboard_previewed",
  "keyboard_unlocked",
  "keyboard_equipped",
  "rewarded_ad_offered",
  "rewarded_ad_completed",
  "rewarded_ad_failed",
  "purchase_started",
  "purchase_completed",
  "purchase_failed",
  "notification_permission_result",
  "notification_scheduled",
  "notification_opened",
]);
const properties = new Set([
  "contentId",
  "content_id",
  "mode",
  "correct",
  "accuracy",
  "durationMs",
  "duration_ms",
  "responseTimeMs",
  "wpm",
  "score",
  "rank",
  "xp",
  "tokens",
  "combo",
  "hintUsed",
  "hint_used",
  "itemCount",
  "item_count",
  "uiLanguage",
  "studyLanguage",
  "language",
  "direction",
  "themeId",
  "theme_id",
  "productId",
  "product_id",
  "stage",
  "level",
  "streak",
  "goalMinutes",
  "hour",
  "minute",
  "granted",
  "provider",
  "reason",
]);

export function createTracker(adapter?: AnalyticsAdapter) {
  return (event: string, input: AnalyticsProperties = {}): void => {
    if (!adapter || !events.has(event)) return;
    const safe: AnalyticsProperties = {};
    for (const [key, value] of Object.entries(input)) {
      if (!properties.has(key)) continue;
      if (typeof value === "number" && Number.isFinite(value))
        safe[key] = value;
      else if (typeof value === "boolean") safe[key] = value;
      // IDs/enums only: reject free text, addresses, and arbitrarily long payloads.
      else if (
        typeof value === "string" &&
        value.length <= 64 &&
        /^[A-Za-z0-9_:.>\-]+$/.test(value)
      )
        safe[key] = value;
    }
    try {
      void Promise.resolve(adapter.capture(event, safe)).catch(() => {});
    } catch {
      /* Telemetry is optional. */
    }
  };
}
