import { DailyProgress, HabitState, StreakState } from "./types";

export function createHabit(): HabitState {
  return {
    daily: {},
    streak: { currentStreak: 0, longestStreak: 0, streakFreezeCount: 0 },
  };
}

/** Uses the device timezone unless an explicit IANA timezone is supplied. */
export function localDateKey(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** The caller records only active foreground intervals. Splits by actual local midnight, including DST. */
export function addStudyTime(
  daily: Record<string, DailyProgress>,
  start: Date,
  end: Date,
  goalSeconds: number,
  timeZone?: string,
): Record<string, DailyProgress> {
  if (
    ![start.getTime(), end.getTime(), goalSeconds].every(Number.isFinite) ||
    goalSeconds <= 0
  )
    throw new Error("INVALID_STUDY_INTERVAL");
  if (end.getTime() <= start.getTime()) return daily;
  const next = { ...daily };
  let cursor = start.getTime();
  while (cursor < end.getTime()) {
    const date = localDateKey(new Date(cursor), timeZone);
    let boundary = Math.min(end.getTime(), cursor + 86400000);
    if (localDateKey(new Date(boundary), timeZone) !== date) {
      let lower = cursor;
      let upper = boundary;
      while (upper - lower > 1) {
        const middle = Math.floor((lower + upper) / 2);
        if (localDateKey(new Date(middle), timeZone) === date) lower = middle;
        else upper = middle;
      }
      boundary = upper;
    }
    const old = next[date];
    const activeStudySeconds =
      (old?.activeStudySeconds ?? 0) + (boundary - cursor) / 1000;
    next[date] = {
      date,
      activeStudySeconds,
      goalSeconds,
      goalCompleted:
        (old?.goalCompleted ?? false) || activeStudySeconds >= goalSeconds,
    };
    cursor = boundary;
  }
  return next;
}

export function completeDay(state: StreakState, date: string): StreakState {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  )
    throw new Error("INVALID_DATE");
  if (state.lastCompletedDate && date <= state.lastCompletedDate) return state;
  const gap = state.lastCompletedDate
    ? Math.round(
        (timestamp - Date.parse(`${state.lastCompletedDate}T00:00:00Z`)) /
          86400000,
      )
    : 0;
  const missing = Math.max(0, gap - 1);
  const bridge = gap > 0 && missing <= state.streakFreezeCount;
  const currentStreak = bridge ? state.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastCompletedDate: date,
    streakFreezeCount: state.streakFreezeCount - (bridge ? missing : 0),
  };
}
