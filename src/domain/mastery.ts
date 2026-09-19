import { DEFAULT_TUNING, TuningConfig } from "./config";
import { MasteryAttempt, MasteryRecord } from "./types";

export function createMastery(contentItemId: string): MasteryRecord {
  return {
    contentItemId,
    stage: "NEW",
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    hintCount: 0,
    masteryScore: 0,
    guidedSuccesses: 0,
    recallSuccesses: 0,
    cleanRecallSuccesses: 0,
    highRankDates: [],
    highRankSessionIds: [],
  };
}

export function updateMastery(
  record: MasteryRecord,
  attempt: MasteryAttempt,
  config: TuningConfig = DEFAULT_TUNING,
): MasteryRecord {
  const at = new Date(attempt.at);
  if (!Number.isFinite(at.getTime())) throw new Error("INVALID_DATE");
  const clean = attempt.correct && !attempt.hintUsed && attempt.mistakes === 0;
  const recall = attempt.mode === "RECALL";
  const guided = attempt.mode === "GUIDED";
  let gain = attempt.correct
    ? config.masteryGain[attempt.mode] *
      (attempt.hintUsed ? config.hintMultiplier : 1) *
      (attempt.mistakes > 0 ? config.mistakeMasteryMultiplier : 1)
    : -config.wrongMasteryLoss;
  if (guided && gain > 0)
    gain = Math.min(
      gain,
      Math.max(0, config.guidedMasteryCap - record.masteryScore),
    );
  const next: MasteryRecord = {
    ...record,
    seenCount: record.seenCount + 1,
    correctCount: record.correctCount + Number(attempt.correct),
    wrongCount: record.wrongCount + Number(!attempt.correct),
    hintCount: record.hintCount + Number(attempt.hintUsed),
    masteryScore: Math.max(0, Math.min(100, record.masteryScore + gain)),
    guidedSuccesses: record.guidedSuccesses + Number(guided && attempt.correct),
    recallSuccesses:
      record.recallSuccesses +
      Number(recall && attempt.correct && !attempt.hintUsed),
    cleanRecallSuccesses: record.cleanRecallSuccesses + Number(recall && clean),
    highRankDates: [...record.highRankDates],
    highRankSessionIds: [...record.highRankSessionIds],
    lastSeenAt: at.toISOString(),
  };
  if (clean && !guided && attempt.elapsedMs > 0)
    next.bestTimeMs = Math.min(
      record.bestTimeMs ?? Infinity,
      attempt.elapsedMs,
    );
  if (next.stage === "NEW" && next.guidedSuccesses >= 1) next.stage = "GUIDED";
  if (
    (next.stage === "NEW" || next.stage === "GUIDED") &&
    next.recallSuccesses >= config.guidedToRecallSuccesses
  )
    next.stage = "RECALL";
  if (
    next.stage === "RECALL" &&
    next.cleanRecallSuccesses >= config.recallToSpeedSuccesses &&
    next.masteryScore >= config.speedMasteryThreshold
  )
    next.stage = "SPEED";
  // High rank must be earned in Speed on different calendar dates and sessions.
  if (
    (record.stage === "SPEED" || record.stage === "MASTERED") &&
    attempt.mode === "SPEED" &&
    clean &&
    (attempt.rank === "S" || attempt.rank === "S+")
  ) {
    const date = attempt.localDate ?? attempt.at.slice(0, 10);
    if (
      !next.highRankDates.includes(date) &&
      !next.highRankSessionIds.includes(attempt.sessionId)
    ) {
      next.highRankDates.push(date);
      next.highRankSessionIds.push(attempt.sessionId);
    }
  }
  if (
    next.stage === "SPEED" &&
    next.masteryScore >= config.masteredThreshold &&
    next.highRankDates.length >= config.masteredDistinctDays &&
    next.highRankSessionIds.length >= config.masteredDistinctSessions
  )
    next.stage = "MASTERED";
  const days =
    [...config.reviewIntervals]
      .sort((a, b) => b.minScore - a.minScore)
      .find((interval) => next.masteryScore >= interval.minScore)?.days ?? 0;
  const minutes = !attempt.correct
    ? config.retryReviewMinutes
    : days > 0
      ? days * 1440
      : config.sameDayReviewMinutes;
  next.nextReviewAt = new Date(at.getTime() + minutes * 60000).toISOString();
  return next;
}
