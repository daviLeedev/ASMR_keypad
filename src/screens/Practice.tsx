import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  AppState,
  Pressable,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Label, Button, styles } from "../components/ui";
import { Keyboard } from "../components/Keyboard";
import { PracticeLayout } from "../components/PracticeLayout";
import { useApp } from "../state/store";
import {
  applySession,
  APP_TUNING,
  recordActiveTime,
  safeHint,
  selectLesson,
  tutorialLesson,
  type AnswerLog,
} from "../state/model";
import {
  compose,
  decomposeKeystrokes,
  matchesAnswer,
  updateTyping,
  scoreAnswer,
  updateCombo,
  type GameMode,
} from "../domain";
import { track } from "../analytics";
import { colors } from "../design-system/theme";
import RainPractice from "./RainPractice";
import { ActiveTimer } from "../state/timing";
import { ghostSegments } from "../state/ghost";
import { playKey } from "../audio";

export default function Practice() {
  const params = useLocalSearchParams<{
    mode?: string;
    tutorial?: string;
    kind?: string;
  }>();
  const mode = (
    ["GUIDED", "RECALL", "SPEED", "RAIN"].includes(params.mode ?? "")
      ? params.mode
      : "GUIDED"
  ) as GameMode;
  return mode === "RAIN" ? (
    <RainPractice />
  ) : (
    <Lesson
      key={`${mode}-${params.tutorial}-${params.kind}`}
      mode={mode}
      tutorial={params.tutorial === "1"}
      sentence={params.kind === "SENTENCE"}
    />
  );
}
function Lesson({
  mode,
  tutorial,
  sentence,
}: {
  mode: GameMode;
  tutorial: boolean;
  sentence: boolean;
}) {
  const profile = useApp((s) => s.profile),
    settings = profile.settings,
    { t } = useTranslation(),
    { height } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const [steps] = useState(() =>
    tutorial
      ? tutorialLesson(settings.studyLanguage)
      : selectLesson(profile, mode, sentence ? "SENTENCE" : "WORD"),
  );
  const [index, setIndex] = useState(0),
    [keys, setKeys] = useState<string[]>([]),
    [typing, setTyping] = useState({ input: "", mistakes: 0, invalid: false }),
    [hint, setHint] = useState(false),
    [feedback, setFeedback] = useState<AnswerLog | null>(null),
    [combo, setCombo] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [paused, setPaused] = useState(false),
    [leaving, setLeaving] = useState(false);
  const started = useRef(new Date()),
    [sessionId] = useState(
      () => `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ),
    answers = useRef<AnswerLog[]>([]),
    activeMs = useRef(0),
    itemTimer = useRef(new ActiveTimer()),
    lastKey = useRef(0),
    studyCursor = useRef<number | null>(null),
    firstKey = useRef(false),
    finished = useRef(false),
    lock = useRef(false);
  const current = steps[index];
  const pausedRef = useRef(paused),
    feedbackRef = useRef(feedback);
  const flushStudy = useCallback((now: number, stop = false) => {
    const from = studyCursor.current;
    const end = Math.min(now, lastKey.current + APP_TUNING.idleMs);
    if (from !== null && end > from && now - from <= 2500) {
      activeMs.current += end - from;
      useApp
        .getState()
        .update((p) =>
          recordActiveTime(p, new Date(from), new Date(end), true),
        );
    }
    studyCursor.current = stop ? null : from === null ? null : now;
  }, []);
  useEffect(() => {
    itemTimer.current.start(performance.now());
  }, []);
  useEffect(() => {
    if (paused || leaving || feedback) {
      flushStudy(Date.now(), true);
      itemTimer.current.pause(performance.now());
    } else itemTimer.current.resume(performance.now());
  }, [paused, leaving, feedback, flushStudy]);
  useEffect(() => {
    pausedRef.current = paused || leaving;
    feedbackRef.current = feedback;
  }, [paused, leaving, feedback]);
  useEffect(() => {
    track(
      mode === "GUIDED"
        ? "lesson_started"
        : mode === "RECALL"
          ? "review_started"
          : "speed_started",
      { mode },
    );
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        flushStudy(Date.now(), true);
        itemTimer.current.pause(performance.now());
        setPaused(true);
      }
    });
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      setLeaving(true);
      return true;
    });
    return () => {
      sub.remove();
      back.remove();
    };
  }, [mode, flushStudy]);
  useEffect(() => {
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(),
        delta = now - previous;
      previous = now;
      if (
        pausedRef.current ||
        feedbackRef.current ||
        delta > 1500 ||
        AppState.currentState === "background"
      )
        return;
      setElapsed(itemTimer.current.elapsed(performance.now()));
      flushStudy(now);
    }, 500);
    return () => clearInterval(timer);
  }, [flushStudy]);
  const submit = (
    input = typing.input,
    mistakes = typing.mistakes,
    timedOut = false,
  ) => {
    if (!current || lock.current || pausedRef.current) return;
    lock.current = true;
    flushStudy(Date.now(), true);
    playKey("press", "enter", { ...settings, hapticsEnabled: false });
    const correct =
      !timedOut &&
      matchesAnswer(input, current.item.acceptedAnswers, {
        language: settings.studyLanguage,
      });
    const score = scoreAnswer({
      correct,
      mistakes,
      hintUsed: hint,
      elapsedMs: Math.max(1, itemTimer.current.elapsed(performance.now())),
      expectedKeystrokes: decomposeKeystrokes(current.item.canonicalAnswer)
        .length,
    });
    const answer: AnswerLog = {
      contentItemId: current.item.id,
      mode: current.mode,
      correct,
      mistakes,
      hintUsed: hint,
      responseTimeMs: Math.max(1, itemTimer.current.elapsed(performance.now())),
      rank: score.rank,
      wpm: current.item.kind === "SENTENCE" ? score.wpm : undefined,
    };
    itemTimer.current.pause(performance.now());
    answers.current.push(answer);
    setFeedback(answer);
    setCombo(
      (c) => updateCombo(c, { correct, mistakes, hintUsed: hint }).combo,
    );
    track("answer_completed", {
      contentId: current.item.id,
      mode: current.mode,
      correct,
      mistakes,
      hintUsed: hint,
      responseTimeMs: answer.responseTimeMs,
      rank: answer.rank,
    });
  };
  useEffect(() => {
    if (mode === "SPEED" && elapsed >= APP_TUNING.speedTimeoutMs && !feedback)
      submit(typing.input, typing.mistakes, true);
  });
  const onKey = (key: string) => {
    if (lock.current || pausedRef.current || !current) return;
    if (!firstKey.current) {
      firstKey.current = true;
      track("first_key_pressed", {
        durationMs: Date.now() - started.current.getTime(),
        tutorial,
      });
    }
    const keyTime = Date.now();
    flushStudy(keyTime);
    studyCursor.current = keyTime;
    lastKey.current = keyTime;
    const nextKeys = key === "BACKSPACE" ? keys.slice(0, -1) : [...keys, key];
    const input =
      settings.studyLanguage === "ko" ? compose(nextKeys) : nextKeys.join("");
    const nextTyping = updateTyping(
      typing,
      input,
      current.item.acceptedAnswers,
      { language: settings.studyLanguage },
    );
    setKeys(nextKeys);
    setTyping(nextTyping);
    if (
      matchesAnswer(input, current.item.acceptedAnswers, {
        language: settings.studyLanguage,
      })
    )
      submit(input, nextTyping.mistakes);
  };
  const next = () => {
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      setKeys([]);
      setTyping({ input: "", mistakes: 0, invalid: false });
      setFeedback(null);
      setHint(false);
      itemTimer.current.start(performance.now());
      setElapsed(0);
      lock.current = false;
    } else if (!finished.current) {
      finished.current = true;
      const before = useApp.getState().profile;
      const after = applySession(before, {
        id: sessionId,
        mode,
        tutorial,
        startedAt: started.current.toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: activeMs.current,
        answers: answers.current,
      });
      useApp.getState().update(() => after);
      useApp.setState({ lastResult: after.sessions.at(-1) ?? null });
      track(
        mode === "GUIDED"
          ? "lesson_completed"
          : mode === "RECALL"
            ? "review_completed"
            : "speed_completed",
        { mode, correct: answers.current.filter((a) => a.correct).length },
      );
      if (tutorial) {
        track("micro_tutorial_completed");
        track("onboarding_completed");
      }
      router.replace("/result");
    }
  };
  if (!current)
    return (
      <Screen>
        <Label>{t(mode === "GUIDED" ? "noWords" : "lockedMode")}</Label>
        <Button
          title={t("learn")}
          onPress={() =>
            router.replace(
              `/practice?mode=GUIDED&kind=${sentence ? "SENTENCE" : "WORD"}`,
            )
          }
        />
        <Button
          secondary
          title={t("home")}
          onPress={() => router.replace("/home")}
        />
      </Screen>
    );
  const available = height - insets.top - insets.bottom - 40,
    keyboardHeight = sentence
      ? Math.min(330, Math.max(260, available * 0.47))
      : Math.min(320, Math.max(215, available * 0.39));
  const guided = current.mode === "GUIDED",
    canonical = current.item.canonicalAnswer;
  const compactSentence = sentence && height <= 620;
  const segments =
    settings.studyLanguage === "ko" && guided && !typing.invalid
      ? ghostSegments(keys, canonical)
      : null;
  const suffix =
    guided && !typing.invalid
      ? Array.from(canonical).slice(Array.from(typing.input).length).join("")
      : "";
  const header = (
    <View style={[styles.spread, { minHeight: 48 }]}>
      <Pressable
        accessibilityLabel={t("exit")}
        accessibilityRole="button"
        onPress={() => setLeaving(true)}
        style={{ padding: 8 }}
      >
        <Label style={{ fontSize: 24 }}>×</Label>
      </Pressable>
      <Label style={{ fontWeight: "600" }}>
        {t(
          tutorial
            ? "tutorial"
            : mode === "GUIDED"
              ? "learn"
              : mode === "RECALL"
                ? "review"
                : "speed",
        )}
      </Label>
      <Label muted>
        {index + 1} / {steps.length}
      </Label>
    </View>
  );
  const progress = (
    <View
      testID="practice-progress"
      style={{ height: 4, borderRadius: 3, backgroundColor: colors.border }}
    >
      <View
        style={{
          height: 4,
          borderRadius: 3,
          backgroundColor: colors.primary,
          width: `${((index + (feedback ? 1 : 0)) / steps.length) * 100}%`,
        }}
      />
    </View>
  );
  const body = (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        justifyContent: compactSentence ? "flex-start" : "center",
        gap: compactSentence ? 4 : 10,
      }}
    >
      <View testID="practice-status" style={styles.spread}>
        <Text style={styles.eyebrow}>
          {t(guided ? "guided" : "promptLabel")}
        </Text>
        <Label
          muted
          style={{
            fontSize: compactSentence ? 11 : 12,
            lineHeight: compactSentence ? 16 : 23,
          }}
        >
          {mode === "SPEED"
            ? `${Math.max(0, 30 - elapsed / 1000).toFixed(1)}s`
            : `${combo} ${t("combo")}`}
        </Label>
      </View>
      <Text
        testID="prompt"
        style={{
          fontSize: compactSentence
            ? 18
            : current.item.kind === "SENTENCE"
              ? 22
              : 34,
          lineHeight: compactSentence
            ? 23
            : current.item.kind === "SENTENCE"
              ? 30
              : 42,
          fontWeight: "700",
          color: colors.navy,
        }}
      >
        {current.item.prompt}
      </Text>
      <View
        testID="answer-region"
        style={{
          paddingVertical: compactSentence ? 4 : 12,
          minHeight: compactSentence ? 38 : 70,
          borderBottomWidth: 2,
          borderBottomColor: typing.invalid ? colors.error : colors.border,
        }}
      >
        <Text
          style={{
            fontSize: compactSentence
              ? 17
              : current.item.kind === "SENTENCE"
                ? 21
                : 32,
            lineHeight: compactSentence
              ? 22
              : current.item.kind === "SENTENCE"
                ? 29
                : 42,
            color: typing.invalid ? colors.error : colors.navy,
          }}
        >
          <Text>{segments ? segments.committed : typing.input}</Text>
          {guided ? (
            <Text testID="ghost-suffix" style={{ color: colors.ghost }}>
              {segments
                ? segments.ghost
                : suffix || (!typing.input ? canonical : "")}
            </Text>
          ) : !typing.input ? (
            <Text style={{ color: colors.ghost, fontSize: 20 }}>
              {t("answerPlaceholder")}
            </Text>
          ) : null}
          <Text style={{ color: colors.primaryStrong }}>│</Text>
        </Text>
        {segments?.composing ? (
          <Text
            testID="composing-jamo"
            style={{ fontSize: 14, color: colors.primaryStrong }}
          >
            {segments.composing}
          </Text>
        ) : null}
      </View>
      {feedback ? (
        <View
          testID="answer-feedback"
          accessibilityLiveRegion="polite"
          style={{ gap: compactSentence ? 2 : 4 }}
        >
          <View style={styles.spread}>
            <Label
              style={{
                color: feedback.correct ? colors.success : colors.error,
                fontWeight: "700",
                fontSize: compactSentence ? 12 : 15,
                lineHeight: compactSentence ? 16 : 23,
              }}
            >
              {t(feedback.correct ? "correct" : "correction")} · {feedback.rank}
            </Label>
            {feedback.wpm !== undefined && (
              <Label
                muted
                style={{
                  fontSize: compactSentence ? 11 : 15,
                  lineHeight: compactSentence ? 16 : 23,
                }}
              >
                {Math.round(feedback.wpm)} WPM ·{" "}
                {(feedback.responseTimeMs / 1000).toFixed(1)}s
              </Label>
            )}
          </View>
          {!feedback.correct && (
            <Label
              testID="correction"
              style={{
                fontSize: compactSentence ? 13 : 15,
                lineHeight: compactSentence ? 18 : 23,
              }}
            >
              {canonical}
            </Label>
          )}
        </View>
      ) : (
        <Label
          muted
          style={{
            fontSize: compactSentence ? 11 : 12,
            lineHeight: compactSentence ? 16 : 23,
          }}
        >
          {hint
            ? `${safeHint(canonical)} · ${t("hintUsed")}`
            : t(guided ? "ghostHelp" : "recallHelp")}
          {typing.invalid ? ` · ${t("correction")}` : ""}
        </Label>
      )}
    </View>
  );
  const actions = (
    <View style={[styles.row, { minHeight: 46 }]}>
      {feedback ? (
        <View style={{ flex: 1 }}>
          <Button
            testID="next-answer"
            title={t(index + 1 === steps.length ? "finish" : "next")}
            onPress={next}
          />
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>
            <Button
              testID="submit-answer"
              secondary
              title={t("submit")}
              disabled={!typing.input}
              onPress={() => submit()}
            />
          </View>
          {!guided && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("hint")}
              onPress={() => setHint(true)}
              style={{ padding: 10 }}
            >
              <Label muted style={{ fontSize: 12 }}>
                {t("hint")}
              </Label>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
  const overlay =
    paused || leaving ? (
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#F7FBFFFA",
          justifyContent: "center",
          padding: 30,
          gap: 20,
        }}
      >
        <Text style={styles.title}>{t(leaving ? "exit" : "paused")}</Text>
        <Button
          title={t(leaving ? "stay" : "resume")}
          onPress={() => {
            setPaused(false);
            setLeaving(false);
          }}
        />
        {leaving && (
          <Button
            secondary
            title={t("leave")}
            onPress={() => router.replace("/home")}
          />
        )}
      </View>
    ) : undefined;
  return (
    <PracticeLayout
      header={header}
      progress={progress}
      body={body}
      actions={actions}
      keyboard={
        <Keyboard
          height={keyboardHeight}
          language={settings.studyLanguage}
          themeId={profile.selectedThemeId}
          settings={settings}
          onKey={onKey}
          sentence={current.item.kind === "SENTENCE"}
          disabled={!!feedback || paused || leaving}
          bottomInset={insets.bottom}
          feedbackMode={mode === "SPEED" ? "score" : "quiet"}
        />
      }
      overlay={overlay}
    />
  );
}
