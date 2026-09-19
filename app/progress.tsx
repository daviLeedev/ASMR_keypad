import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Label,
  Button,
  ProgressRail,
  styles,
} from "../src/components/ui";
import { Icon } from "../src/components/Icon";
import { PageIntro, ShellHeader, Destination } from "../src/components/Shell";
import { useApp } from "../src/state/store";
import { levelForXp, localDateKey } from "../src/domain";
import { colors } from "../src/design-system/theme";
export default function Progress() {
  const p = useApp((s) => s.profile),
    { t } = useTranslation();
  const seconds =
    p.habit.daily[localDateKey(new Date())]?.activeStudySeconds ?? 0;
  const titles = {
    GUIDED: "learn",
    RECALL: "review",
    SPEED: "speed",
    RAIN: "rain",
  };
  return (
    <Screen active="progress">
      <ShellHeader title={t("journal")} />
      <PageIntro
        eyebrow={t("yourRhythm")}
        title={t("journalTitle")}
        body={t("progressIntro")}
      />
      <View
        style={{
          gap: 18,
          padding: 22,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 24,
          backgroundColor: colors.background,
        }}
      >
        <View style={styles.spread}>
          <Label>{t("daily")}</Label>
          <Label>
            {Math.floor(seconds / 60)} / {p.settings.dailyGoalMinutes}{" "}
            {t("minutes")}
          </Label>
        </View>
        <ProgressRail value={seconds / (p.settings.dailyGoalMinutes * 60)} />
        <View style={styles.spread}>
          <Label>
            {p.habit.streak.currentStreak} {t("streak")}
          </Label>
          <Label>
            {t("level")} {levelForXp(p.xp)} · {p.xp} XP
          </Label>
        </View>
      </View>
      <Text style={styles.eyebrow}>{t("recentSessions")}</Text>
      {!p.sessions.length && (
        <View
          style={{
            alignItems: "center",
            gap: 18,
            paddingVertical: 26,
            paddingHorizontal: 22,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 24,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="chart" size={30} color={colors.primaryStrong} />
          </View>
          <Label muted style={{ textAlign: "center" }}>
            {t("noSessions")}
          </Label>
          <Button
            secondary
            title={t("goLearn")}
            onPress={() => router.push("/learn")}
          />
        </View>
      )}
      {[...p.sessions]
        .reverse()
        .slice(0, 5)
        .map((session) => (
          <View
            key={session.id}
            style={[
              styles.spread,
              {
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={{ gap: 4 }}>
              <Text style={styles.subtitle}>{t(titles[session.mode])}</Text>
              <Label muted style={{ fontSize: 12 }}>
                {new Date(session.endedAt).toLocaleDateString(
                  p.settings.uiLanguage,
                )}{" "}
                · {session.correct}/{session.total}
              </Label>
            </View>
            <Label>
              {session.rank} · +{session.xp} XP
            </Label>
          </View>
        ))}
      <Destination
        title={t("preferences")}
        body={t("goalBody")}
        mark="◴"
        onPress={() => router.push("/settings")}
      />
    </Screen>
  );
}
