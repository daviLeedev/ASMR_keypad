import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Label,
  Card,
  Button,
  Nav,
  ProgressRail,
  styles,
} from "../src/components/ui";
import { useApp } from "../src/state/store";
import { localDateKey, levelForXp } from "../src/domain";
import { colors } from "../src/design-system/theme";
import { selectLesson } from "../src/state/model";
export default function Home() {
  const [kind, setKind] = useState<"WORD" | "SENTENCE">("WORD");
  const p = useApp((s) => s.profile),
    { t } = useTranslation();
  const today = p.habit.daily[localDateKey(new Date())],
    seconds = today?.activeStudySeconds ?? 0,
    goal = p.settings.dailyGoalMinutes * 60;
  const due = Object.values(p.mastery).filter(
    (m) =>
      m.stage !== "NEW" &&
      (!m.nextReviewAt || new Date(m.nextReviewAt) <= new Date()),
  ).length;
  return (
    <Screen>
      <Header
        title="KeyLingo"
        right={<Text style={styles.badge}>{p.economy.balance} ◇</Text>}
      />
      <Card style={{ backgroundColor: "#E5F3FF", padding: 22, gap: 15 }}>
        <View style={{ gap: 6 }}>
          <Text style={styles.eyebrow}>{t("today")}</Text>
          <Text style={styles.title}>{t("continueLearning")}</Text>
          <Label muted>{t("homeBody")}</Label>
        </View>
        <View style={styles.spread}>
          <Label>{t("daily")}</Label>
          <Label style={{ fontWeight: "700" }}>
            {Math.floor(seconds / 60)} / {p.settings.dailyGoalMinutes}{" "}
            {t("minutes")}
          </Label>
        </View>
        <ProgressRail value={seconds / goal} testID="daily-progress" />
        <View style={styles.spread}>
          <Label muted style={{ fontSize: 12 }}>
            {p.habit.streak.currentStreak} {t("streak")}
          </Label>
          <Label muted style={{ fontSize: 12 }}>
            {t("level")} {levelForXp(p.xp)} · {p.xp} XP
          </Label>
        </View>
        <Button
          title={t("start")}
          testID="start-learning"
          onPress={() => router.replace(`/practice?mode=GUIDED&kind=${kind}`)}
        />
      </Card>
      <View style={styles.spread}>
        <Text style={styles.subtitle}>{t("practice")}</Text>
        <Label muted style={{ fontSize: 12 }}>
          {due} {t("due")}
        </Label>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title={t("vocabulary")}
            secondary={kind !== "WORD"}
            onPress={() => setKind("WORD")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            testID="sentence-mode"
            title={t("sentence")}
            secondary={kind !== "SENTENCE"}
            onPress={() => setKind("SENTENCE")}
          />
        </View>
      </View>
      {(
        [
          { mode: "GUIDED", title: "learn", body: "learnBody", mark: "Aa" },
          { mode: "RECALL", title: "review", body: "reviewBody", mark: "↺" },
          { mode: "SPEED", title: "speed", body: "speedBody", mark: "↗" },
          { mode: "RAIN", title: "rain", body: "rainBody", mark: "≋" },
        ] as const
      ).map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(item.title)}
          testID={`mode-${item.mode}`}
          key={item.mode}
          onPress={() =>
            router.replace(
              `/practice?mode=${item.mode}&kind=${item.mode === "RAIN" ? "WORD" : kind}`,
            )
          }
          style={[styles.card, styles.row, { padding: 15 }]}
        >
          <View
            style={{
              height: 44,
              width: 44,
              borderRadius: 12,
              backgroundColor: "#E9F4FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "600",
                color: colors.primaryStrong,
              }}
            >
              {item.mark}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitle}>{t(item.title)}</Text>
            <Label muted style={{ fontSize: 12 }}>
              {t(item.body)}
            </Label>
          </View>
          <Label muted>
            {item.mode !== "GUIDED" &&
            !selectLesson(p, item.mode, item.mode === "RAIN" ? "WORD" : kind)
              .length
              ? "○"
              : "›"}
          </Label>
        </Pressable>
      ))}
      <Nav active="home" />
    </Screen>
  );
}
