import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Header, Label, Button, styles } from "../components/ui";
import { PageIntro, Destination, shell } from "../components/Shell";
import { useApp } from "../state/store";
import { selectLesson } from "../state/model";
import { colors } from "../design-system/theme";
export default function ModeSelection({
  arcade = false,
}: {
  arcade?: boolean;
}) {
  const { t } = useTranslation(),
    p = useApp((s) => s.profile);
  const [kind, setKind] = useState<"WORD" | "SENTENCE">("WORD");
  const modes = arcade
    ? (["SPEED", "RAIN"] as const)
    : (["GUIDED", "RECALL"] as const);
  const titles = {
    GUIDED: "learn",
    RECALL: "review",
    SPEED: "speed",
    RAIN: "rain",
  };
  const bodies = {
    GUIDED: "learnBody",
    RECALL: "reviewBody",
    SPEED: "speedBody",
    RAIN: "rainBody",
  };
  return (
    <Screen>
      <Header title={t(arcade ? "arcade" : "learning")} back parent="/play" />
      <PageIntro
        eyebrow={t(arcade ? "timed" : "untimed")}
        title={t(arcade ? "arcadeTitle" : "learningTitle")}
        body={arcade ? t("arcadeNote") : undefined}
      />
      <View style={{ gap: 12 }}>
        <Text style={styles.eyebrow}>{t("chooseFormat")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["WORD", "SENTENCE"] as const).map((value) => (
            <Pressable
              key={value}
              testID={value === "SENTENCE" ? "sentence-mode" : "word-mode"}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === value }}
              onPress={() => setKind(value)}
              style={[
                shell.pill,
                {
                  backgroundColor:
                    value === kind ? colors.navy : colors.background,
                },
              ]}
            >
              <Text style={{ color: value === kind ? "white" : colors.navy }}>
                {t(value === "WORD" ? "vocabulary" : "sentence")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View>
        {modes.map((mode) => {
          const ready =
            selectLesson(p, mode, mode === "RAIN" ? "WORD" : kind).length > 0;
          return (
            <Destination
              key={mode}
              title={t(titles[mode])}
              body={t(bodies[mode])}
              note={t(
                ready
                  ? mode === "RAIN"
                    ? "vocabulary"
                    : "available"
                  : arcade
                    ? "needsRecall"
                    : "needsLearning",
              )}
              mark={
                mode === "GUIDED"
                  ? "Aa"
                  : mode === "RECALL"
                    ? "↺"
                    : mode === "SPEED"
                      ? "↗"
                      : "≋"
              }
              testID={`mode-${mode}`}
              onPress={() =>
                ready
                  ? router.push(
                      `/practice?mode=${mode}&kind=${mode === "RAIN" ? "WORD" : kind}`,
                    )
                  : router.push(
                      arcade ? "/learn" : `/practice?mode=GUIDED&kind=${kind}`,
                    )
              }
            />
          );
        })}
      </View>
      <Label muted>{t(arcade ? "arcadeDetail" : "learningDetail")}</Label>
      {arcade && !selectLesson(p, "SPEED", kind).length && (
        <Button
          secondary
          title={t("goLearn")}
          onPress={() => router.push("/learn")}
        />
      )}
    </Screen>
  );
}
