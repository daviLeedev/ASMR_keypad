import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Label, styles } from "../src/components/ui";
import { ShellHeader, PageIntro, Destination } from "../src/components/Shell";
export default function Play() {
  const { t } = useTranslation();
  return (
    <Screen active="play">
      <ShellHeader title={t("play")} />
      <PageIntro
        eyebrow="KEYLINGO / PLAY"
        title={t("playTitle")}
        body={t("playSubtitle")}
      />
      <View>
        <Destination
          testID="open-learning"
          title={t("learning")}
          body={t("learningIntro")}
          note={t("learningDetail")}
          mark="Aa"
          onPress={() => router.push("/learn")}
        />
        <Destination
          testID="open-arcade"
          title={t("arcade")}
          body={t("arcadeIntro")}
          note={t("arcadeDetail")}
          mark="↗"
          onPress={() => router.push("/arcade")}
        />
      </View>
      <View style={{ gap: 8, paddingTop: 12 }}>
        <Text style={styles.eyebrow}>{t("yourRhythm")}</Text>
        <Label muted>{t("tagline")}</Label>
      </View>
    </Screen>
  );
}
