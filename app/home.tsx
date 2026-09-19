import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Label,
  Button,
  ProgressRail,
  styles,
} from "../src/components/ui";
import { ShellHeader, PageIntro } from "../src/components/Shell";
import { KeyboardExhibit } from "../src/components/KeyboardExhibit";
import { useApp } from "../src/state/store";
import { localDateKey } from "../src/domain";
import { getTheme } from "../src/design-system/theme";
import { seedItems } from "../src/content";
export default function Home() {
  const p = useApp((s) => s.profile),
    { t } = useTranslation();
  const seconds =
    p.habit.daily[localDateKey(new Date())]?.activeStudySeconds ?? 0;
  const goal = p.settings.dailyGoalMinutes * 60,
    theme = getTheme(p.selectedThemeId);
  const due = seedItems.some((item) => {
    const m = p.mastery[item.id];
    return (
      item.targetLanguage === p.settings.studyLanguage &&
      item.kind === "WORD" &&
      m &&
      m.stage !== "NEW" &&
      (!m.nextReviewAt || new Date(m.nextReviewAt) <= new Date())
    );
  });
  return (
    <Screen active="home" compact>
      <ShellHeader />
      <PageIntro eyebrow={t("playground")} title={t("homeTitle")} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${theme.name} · ${t("details")}`}
        onPress={() => router.push(`/keyboard/${theme.id}`)}
        style={{ gap: 3 }}
      >
        <KeyboardExhibit theme={theme} compact />
        <View style={styles.spread}>
          <Text style={styles.eyebrow}>{t("yourKeyboard")}</Text>
          <Label style={{ fontSize: 12 }}>{theme.name} ↗</Label>
        </View>
      </Pressable>
      <View style={{ gap: 12 }}>
        <Button
          testID="start-learning"
          title={t("start")}
          onPress={() =>
            router.push(`/practice?mode=${due ? "RECALL" : "GUIDED"}&kind=WORD`)
          }
        />
      </View>
      <View style={{ gap: 9, paddingVertical: 4 }}>
        <View style={styles.spread}>
          <Label muted style={{ fontSize: 12 }}>
            {t("daily")}
          </Label>
          <Label style={{ fontSize: 12 }}>
            {Math.floor(seconds / 60)} / {p.settings.dailyGoalMinutes}{" "}
            {t("minutes")} · {p.habit.streak.currentStreak} {t("streak")}
          </Label>
        </View>
        <ProgressRail value={seconds / goal} testID="daily-progress" />
      </View>
    </Screen>
  );
}
