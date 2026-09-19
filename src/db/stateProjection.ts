import type { DatabaseDriver } from "./repository";
import type { EconomyState, HabitState, MasteryRecord } from "../domain/types";
import { levelForXp } from "../domain/scoring";

interface SessionRow {
  id: string;
  mode: string;
  startedAt: string;
  endedAt: string;
  correct: number;
  total: number;
  xp: number;
  tokens: number;
  answers: {
    contentItemId: string;
    correct: boolean;
    mistakes: number;
    hintUsed: boolean;
    responseTimeMs: number;
    rank?: string;
  }[];
}
interface ProjectedState {
  settings?: Record<string, unknown>;
  economy?: EconomyState;
  mastery?: Record<string, MasteryRecord>;
  habit?: HabitState;
  xp?: number;
  selectedThemeId?: string;
  sessions?: SessionRow[];
}
// A compact JSON snapshot preserves versioned application fields; relational projections
// support review queries and auditable economy/session history in the same transaction.
export async function projectState(
  db: DatabaseDriver,
  value: unknown,
  previousValue?: unknown,
): Promise<void> {
  if (!value || typeof value !== "object") return;
  const state = value as ProjectedState,
    previous = (previousValue ?? {}) as ProjectedState,
    now = new Date().toISOString();
  const changed = (left: unknown, right: unknown) =>
    JSON.stringify(left) !== JSON.stringify(right);
  if (
    state.economy &&
    (changed(state.economy, previous.economy) ||
      state.xp !== previous.xp ||
      state.selectedThemeId !== previous.selectedThemeId)
  ) {
    const xp = state.xp ?? 0;
    await db.runAsync(
      "INSERT INTO user_profile VALUES (?,?,?,?,?,?) ON CONFLICT(local_user_id) DO UPDATE SET level=excluded.level,xp=excluded.xp,token_balance=excluded.token_balance,selected_keyboard_theme_id=excluded.selected_keyboard_theme_id",
      "local",
      levelForXp(xp),
      xp,
      state.economy.balance,
      state.selectedThemeId ?? "starter",
      now,
    );
    const previousEntries = new Set(
      previous.economy?.ledger.map((entry) => entry.id),
    );
    for (const entry of state.economy.ledger)
      if (!previousEntries.has(entry.id))
        await db.runAsync(
          "INSERT INTO economy_ledger VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
          entry.id,
          entry.reason,
          entry.amount,
          entry.balanceAfter,
          entry.referenceId ?? null,
          entry.createdAt,
        );
    for (const id of state.economy.unlockedThemeIds)
      if (!previous.economy?.unlockedThemeIds.includes(id))
        await db.runAsync(
          "INSERT INTO keyboard_inventory VALUES (?,?,?) ON CONFLICT(keyboard_theme_id) DO NOTHING",
          id,
          now,
          id === "starter" ? "default" : "earned",
        );
  }
  if (state.mastery)
    for (const [id, m] of Object.entries(state.mastery)) {
      if (!changed(m, previous.mastery?.[id])) continue;
      await db.runAsync(
        "INSERT INTO mastery VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(content_item_id) DO UPDATE SET stage=excluded.stage,seen_count=excluded.seen_count,correct_count=excluded.correct_count,wrong_count=excluded.wrong_count,hint_count=excluded.hint_count,best_time_ms=excluded.best_time_ms,mastery_score=excluded.mastery_score,last_seen_at=excluded.last_seen_at,next_review_at=excluded.next_review_at,detail_json=excluded.detail_json",
        id,
        m.stage,
        m.seenCount,
        m.correctCount,
        m.wrongCount,
        m.hintCount,
        m.bestTimeMs ?? null,
        m.masteryScore,
        m.lastSeenAt ?? null,
        m.nextReviewAt ?? null,
        JSON.stringify(m),
      );
    }
  if (state.sessions)
    for (const session of state.sessions) {
      if (
        !changed(
          session,
          previous.sessions?.find((row) => row.id === session.id),
        )
      )
        continue;
      await db.runAsync(
        "INSERT INTO learning_session VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET ended_at=excluded.ended_at,items_presented=excluded.items_presented,items_correct=excluded.items_correct,xp_earned=excluded.xp_earned,tokens_earned=excluded.tokens_earned",
        session.id,
        session.mode,
        session.startedAt,
        session.endedAt,
        session.total,
        session.correct,
        session.xp,
        session.tokens,
      );
      for (const [index, a] of session.answers.entries())
        await db.runAsync(
          "INSERT INTO answer_log VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
          `${session.id}:${index}`,
          session.id,
          a.contentItemId,
          session.mode,
          a.correct ? "correct" : "wrong",
          a.responseTimeMs,
          a.mistakes,
          Number(a.hintUsed),
          a.rank ?? null,
          session.endedAt,
        );
    }
  // Keep recent detailed answers, while retaining compact sessions and economy ledger.
  if (changed(state.sessions, previous.sessions))
    await db.runAsync(
      "DELETE FROM answer_log WHERE id IN (SELECT id FROM answer_log ORDER BY created_at DESC,id DESC LIMIT -1 OFFSET 5000)",
    );
  if (state.habit) {
    for (const day of Object.values(state.habit.daily))
      if (changed(day, previous.habit?.daily[day.date]))
        await db.runAsync(
          "INSERT INTO daily_progress VALUES (?,?,?,?) ON CONFLICT(date) DO UPDATE SET active_study_seconds=excluded.active_study_seconds,goal_seconds=excluded.goal_seconds,goal_completed=excluded.goal_completed",
          day.date,
          day.activeStudySeconds,
          day.goalSeconds,
          Number(day.goalCompleted),
        );
    const streak = state.habit.streak;
    if (changed(streak, previous.habit?.streak))
      await db.runAsync(
        "INSERT INTO streak_state VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET current_streak=excluded.current_streak,longest_streak=excluded.longest_streak,last_completed_date=excluded.last_completed_date,streak_freeze_count=excluded.streak_freeze_count",
        streak.currentStreak,
        streak.longestStreak,
        streak.lastCompletedDate ?? null,
        streak.streakFreezeCount,
      );
  }
  if (state.settings && changed(state.settings, previous.settings)) {
    for (const [key, setting] of Object.entries(state.settings))
      if (changed(setting, previous.settings?.[key]))
        await db.runAsync(
          "INSERT INTO app_setting VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          key,
          JSON.stringify(setting),
        );
    await db.runAsync(
      "INSERT INTO reminder_setting VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,local_hour=excluded.local_hour,local_minute=excluded.local_minute",
      Number(Boolean(state.settings.reminderEnabled)),
      "[0,1,2,3,4,5,6]",
      Number(state.settings.reminderHour ?? 19),
      Number(state.settings.reminderMinute ?? 0),
    );
  }
}
