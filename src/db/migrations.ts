export const migrations = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS content_pack (
 id TEXT PRIMARY KEY, version INTEGER NOT NULL, schema_version INTEGER NOT NULL,
 checksum TEXT NOT NULL, source_language TEXT NOT NULL, target_language TEXT NOT NULL,
 item_count INTEGER NOT NULL, installed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_item (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('WORD','SENTENCE')),
 source_language TEXT NOT NULL CHECK(source_language IN ('ko','en')),
 target_language TEXT NOT NULL CHECK(target_language IN ('ko','en')),
 prompt TEXT NOT NULL, canonical_answer TEXT NOT NULL, difficulty TEXT NOT NULL,
 category TEXT NOT NULL, content_pack_id TEXT NOT NULL REFERENCES content_pack(id),
 active INTEGER NOT NULL DEFAULT 1, CHECK(source_language <> target_language)
);
CREATE INDEX IF NOT EXISTS content_direction_idx ON content_item(target_language,kind,active);
CREATE TABLE IF NOT EXISTS accepted_answer (
 id TEXT PRIMARY KEY, content_item_id TEXT NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
 answer TEXT NOT NULL, normalized_answer TEXT NOT NULL, priority INTEGER NOT NULL,
 UNIQUE(content_item_id,normalized_answer)
);
CREATE TABLE IF NOT EXISTS mastery (
 content_item_id TEXT PRIMARY KEY REFERENCES content_item(id),
 stage TEXT NOT NULL CHECK(stage IN ('NEW','GUIDED','RECALL','SPEED','MASTERED')),
 seen_count INTEGER NOT NULL DEFAULT 0, correct_count INTEGER NOT NULL DEFAULT 0,
 wrong_count INTEGER NOT NULL DEFAULT 0, hint_count INTEGER NOT NULL DEFAULT 0,
 best_time_ms INTEGER, mastery_score REAL NOT NULL CHECK(mastery_score BETWEEN 0 AND 100),
 last_seen_at TEXT, next_review_at TEXT, detail_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mastery_review_idx ON mastery(stage,next_review_at,mastery_score);
CREATE TABLE IF NOT EXISTS learning_session (
 id TEXT PRIMARY KEY, mode TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT,
 items_presented INTEGER NOT NULL, items_correct INTEGER NOT NULL,
 xp_earned INTEGER NOT NULL, tokens_earned INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS answer_log (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES learning_session(id) ON DELETE CASCADE,
 content_item_id TEXT NOT NULL REFERENCES content_item(id), mode TEXT NOT NULL,
 result TEXT NOT NULL, response_time_ms INTEGER NOT NULL, mistake_count INTEGER NOT NULL,
 hint_used INTEGER NOT NULL, rank TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS answer_recent_idx ON answer_log(content_item_id,created_at);
CREATE TABLE IF NOT EXISTS user_profile (
 local_user_id TEXT PRIMARY KEY, level INTEGER NOT NULL, xp INTEGER NOT NULL,
 token_balance INTEGER NOT NULL CHECK(token_balance >= 0), selected_keyboard_theme_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS economy_ledger (
 id TEXT PRIMARY KEY, reason TEXT NOT NULL, amount INTEGER NOT NULL,
 balance_after INTEGER NOT NULL CHECK(balance_after >= 0), reference_id TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_reference_idx ON economy_ledger(reason,reference_id) WHERE reference_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS keyboard_inventory (keyboard_theme_id TEXT PRIMARY KEY, unlocked_at TEXT NOT NULL, source TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS daily_progress (date TEXT PRIMARY KEY, active_study_seconds INTEGER NOT NULL, goal_seconds INTEGER NOT NULL, goal_completed INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS streak_state (id INTEGER PRIMARY KEY CHECK(id=1), current_streak INTEGER NOT NULL, longest_streak INTEGER NOT NULL, last_completed_date TEXT, streak_freeze_count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reminder_setting (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL, days_of_week TEXT NOT NULL, local_hour INTEGER NOT NULL CHECK(local_hour BETWEEN 0 AND 23), local_minute INTEGER NOT NULL CHECK(local_minute BETWEEN 0 AND 59));
CREATE TABLE IF NOT EXISTS app_setting (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, updated_at TEXT NOT NULL);
`,
  },
];
