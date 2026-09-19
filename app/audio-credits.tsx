import React from "react";
import { Text, View } from "react-native";
import { audioCredits } from "../src/audio/credits";
import { Header, Label, Screen, styles } from "../src/components/ui";
import { useTranslation } from "react-i18next";

export default function AudioCredits() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Header title={t("audioCredits")} back />
      <View style={{ gap: 6 }}>
        <Text style={styles.subtitle}>{t("audioCreditsTitle")}</Text>
        <Label muted>{t("audioCreditsBody")}</Label>
      </View>
      <View>
        {audioCredits.map((credit) => (
          <View
            key={credit.themeId}
            style={{
              gap: 4,
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderBottomColor: "#D5E5F5",
            }}
          >
            <Text style={styles.subtitle}>{credit.identity}</Text>
            <Label>{credit.source}</Label>
            <Label muted>
              {credit.license} · {credit.author}
            </Label>
          </View>
        ))}
      </View>
      <Label muted style={{ fontSize: 12 }}>
        {t("audioLegacyNote")}
      </Label>
    </Screen>
  );
}
