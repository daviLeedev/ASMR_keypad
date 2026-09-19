import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  AppState,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Screen, Label, Button, styles } from "../components/ui";
import { Keyboard } from "../components/Keyboard";
import { PracticeLayout } from "../components/PracticeLayout";
import { useApp } from "../state/store";
import { createRain, tickRain, typeRain } from "../state/rain";
import {
  applySession,
  recordActiveTime,
  selectLesson,
  APP_TUNING,
} from "../state/model";
import { track } from "../analytics";
import { colors } from "../design-system/theme";
export default function RainPractice() {
  const p = useApp((s) => s.profile),
    { t } = useTranslation(),
    { height } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const [rain, setRain] = useState(() =>
      createRain(
        selectLesson(p, "RAIN").map((s) => s.item),
        p.mastery,
      ),
    ),
    [started, setStarted] = useState(false),
    [paused, setPaused] = useState(false),
    [areaHeight, setAreaHeight] = useState(200);
  const finish = useRef(false),
    lastKey = useRef(0),
    activeMs = useRef(0),
    startedAt = useRef(new Date()),
    [sessionId] = useState(
      () => `rain-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") setPaused(true);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!started || paused) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(),
        delta = now - previous;
      previous = now;
      if (delta > 1000 || AppState.currentState === "background") return;
      setRain((state) => tickRain(state, delta));
      if (now - lastKey.current < APP_TUNING.idleMs) {
        activeMs.current += delta;
      }
    }, 50);
    let lastSave = Date.now();
    const habitTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastKey.current < APP_TUNING.idleMs)
        useApp
          .getState()
          .update((old) =>
            recordActiveTime(old, new Date(lastSave), new Date(now), true),
          );
      lastSave = now;
    }, 1000);
    return () => {
      clearInterval(timer);
      clearInterval(habitTimer);
    };
  }, [started, paused]);
  useEffect(() => {
    if (rain.done && !finish.current) {
      finish.current = true;
      const after = applySession(useApp.getState().profile, {
        id: sessionId,
        mode: "RAIN",
        tutorial: false,
        startedAt: startedAt.current.toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: activeMs.current,
        score: rain.score,
        answers: rain.answers,
      });
      useApp.getState().update(() => after);
      useApp.setState({ lastResult: after.sessions.at(-1) ?? null });
      track("word_rain_completed", {
        score: rain.score,
        correct: rain.answers.filter((a) => a.correct).length,
      });
      router.replace("/result");
    }
  }, [rain, sessionId]);
  if (!rain.falling.length && !started)
    return (
      <Screen>
        <Label>{t("rainEmpty")}</Label>
        <Button
          title={t("review")}
          onPress={() => router.replace("/practice?mode=RECALL")}
        />
        <Button
          secondary
          title={t("home")}
          onPress={() => router.replace("/home")}
        />
      </Screen>
    );
  const keyboardHeight = Math.min(
    320,
    Math.max(215, (height - insets.top - insets.bottom - 40) * 0.39),
  );
  return (
    <PracticeLayout
      header={
        <View style={[styles.spread, { minHeight: 48 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("paused")}
            onPress={() => setPaused(true)}
          >
            <Label style={{ fontSize: 24 }}>Ⅱ</Label>
          </Pressable>
          <Label style={{ fontWeight: "700" }}>{t("rain")}</Label>
          <Label>{Math.ceil((60000 - rain.elapsedMs) / 1000)}s</Label>
        </View>
      }
      progress={
        <View style={styles.spread}>
          <Text style={styles.eyebrow}>
            {t("score")} {rain.score}
          </Text>
          <Label muted>
            {rain.combo} {t("combo")}
          </Label>
        </View>
      }
      body={
        <View
          testID="rain-area"
          onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}
          style={{
            flex: 1,
            minHeight: 70,
            borderBottomWidth: 2,
            borderBottomColor: colors.primary,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {rain.falling.map((word, i) => (
            <View
              key={word.instanceId}
              testID="rain-prompt"
              style={{
                position: "absolute",
                top: word.y * Math.max(1, areaHeight - 42),
                left: `${(i % 3) * 28 + 3}%`,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: "#E7F3FF",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Label style={{ fontSize: 16, fontWeight: "600" }}>
                {word.item.prompt}
              </Label>
            </View>
          ))}
          {!started && (
            <View
              style={{
                position: "absolute",
                inset: 0,
                justifyContent: "center",
                backgroundColor: "#F7FBFFF5",
                gap: 16,
              }}
            >
              <Label>{t("rainInstructions")}</Label>
              <Button
                testID="start-rain"
                title={t("rainStart")}
                onPress={() => {
                  startedAt.current = new Date();
                  setStarted(true);
                  track("word_rain_started");
                }}
              />
            </View>
          )}
        </View>
      }
      actions={
        <Text
          testID="rain-input"
          style={{
            minHeight: 43,
            fontSize: 26,
            color: rain.invalid ? colors.error : colors.navy,
          }}
        >
          {rain.input || (
            <Text style={{ color: colors.ghost, fontSize: 18 }}>
              {t("answerPlaceholder")}
            </Text>
          )}
          │
        </Text>
      }
      keyboard={
        <Keyboard
          height={keyboardHeight}
          language={p.settings.studyLanguage}
          themeId={p.selectedThemeId}
          settings={p.settings}
          disabled={!started || paused || rain.done}
          feedbackMode="score"
          bottomInset={insets.bottom}
          onKey={(key) => {
            lastKey.current = Date.now();
            setRain((state) => typeRain(state, key, p.settings.studyLanguage));
          }}
        />
      }
      overlay={
        paused ? (
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
            <Text style={styles.title}>{t("paused")}</Text>
            <Button title={t("resume")} onPress={() => setPaused(false)} />
            <Button
              secondary
              title={t("leave")}
              onPress={() => router.replace("/home")}
            />
          </View>
        ) : undefined
      }
    />
  );
}
