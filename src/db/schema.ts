import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const contentPack = sqliteTable("content_pack", {
  id: text("id").primaryKey(),
  version: integer("version").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  checksum: text("checksum").notNull(),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  itemCount: integer("item_count").notNull(),
  installedAt: text("installed_at").notNull(),
});
export const contentItem = sqliteTable(
  "content_item",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["WORD", "SENTENCE"] }).notNull(),
    sourceLanguage: text("source_language", { enum: ["ko", "en"] }).notNull(),
    targetLanguage: text("target_language", { enum: ["ko", "en"] }).notNull(),
    prompt: text("prompt").notNull(),
    canonicalAnswer: text("canonical_answer").notNull(),
    difficulty: text("difficulty").notNull(),
    category: text("category").notNull(),
    contentPackId: text("content_pack_id")
      .notNull()
      .references(() => contentPack.id),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    index("content_direction_idx").on(
      table.targetLanguage,
      table.kind,
      table.active,
    ),
  ],
);
export const acceptedAnswer = sqliteTable(
  "accepted_answer",
  {
    id: text("id").primaryKey(),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    answer: text("answer").notNull(),
    normalizedAnswer: text("normalized_answer").notNull(),
    priority: integer("priority").notNull(),
  },
  (table) => [
    uniqueIndex("answer_unique_idx").on(
      table.contentItemId,
      table.normalizedAnswer,
    ),
  ],
);
export const mastery = sqliteTable(
  "mastery",
  {
    contentItemId: text("content_item_id")
      .primaryKey()
      .references(() => contentItem.id),
    stage: text("stage", {
      enum: ["NEW", "GUIDED", "RECALL", "SPEED", "MASTERED"],
    }).notNull(),
    seenCount: integer("seen_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    hintCount: integer("hint_count").notNull().default(0),
    bestTimeMs: integer("best_time_ms"),
    masteryScore: real("mastery_score").notNull(),
    lastSeenAt: text("last_seen_at"),
    nextReviewAt: text("next_review_at"),
    detailJson: text("detail_json").notNull(),
  },
  (table) => [
    index("mastery_review_idx").on(
      table.stage,
      table.nextReviewAt,
      table.masteryScore,
    ),
  ],
);
export const learningSession = sqliteTable("learning_session", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  itemsPresented: integer("items_presented").notNull(),
  itemsCorrect: integer("items_correct").notNull(),
  xpEarned: integer("xp_earned").notNull(),
  tokensEarned: integer("tokens_earned").notNull(),
});
export const answerLog = sqliteTable("answer_log", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => learningSession.id, { onDelete: "cascade" }),
  contentItemId: text("content_item_id")
    .notNull()
    .references(() => contentItem.id),
  mode: text("mode").notNull(),
  result: text("result").notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  mistakeCount: integer("mistake_count").notNull(),
  hintUsed: integer("hint_used", { mode: "boolean" }).notNull(),
  rank: text("rank"),
  createdAt: text("created_at").notNull(),
});
export const userProfile = sqliteTable("user_profile", {
  localUserId: text("local_user_id").primaryKey(),
  level: integer("level").notNull(),
  xp: integer("xp").notNull(),
  tokenBalance: integer("token_balance").notNull(),
  selectedKeyboardThemeId: text("selected_keyboard_theme_id").notNull(),
  createdAt: text("created_at").notNull(),
});
export const economyLedger = sqliteTable("economy_ledger", {
  id: text("id").primaryKey(),
  reason: text("reason").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceId: text("reference_id"),
  createdAt: text("created_at").notNull(),
});
export const keyboardInventory = sqliteTable("keyboard_inventory", {
  keyboardThemeId: text("keyboard_theme_id").primaryKey(),
  unlockedAt: text("unlocked_at").notNull(),
  source: text("source").notNull(),
});
export const dailyProgress = sqliteTable("daily_progress", {
  date: text("date").primaryKey(),
  activeStudySeconds: integer("active_study_seconds").notNull(),
  goalSeconds: integer("goal_seconds").notNull(),
  goalCompleted: integer("goal_completed", { mode: "boolean" }).notNull(),
});
export const streakState = sqliteTable("streak_state", {
  id: integer("id").primaryKey(),
  currentStreak: integer("current_streak").notNull(),
  longestStreak: integer("longest_streak").notNull(),
  lastCompletedDate: text("last_completed_date"),
  streakFreezeCount: integer("streak_freeze_count").notNull(),
});
export const reminderSetting = sqliteTable("reminder_setting", {
  id: integer("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  daysOfWeek: text("days_of_week").notNull(),
  localHour: integer("local_hour").notNull(),
  localMinute: integer("local_minute").notNull(),
});
export const appSetting = sqliteTable("app_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const appState = sqliteTable("app_state", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});
