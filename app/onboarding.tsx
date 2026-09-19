import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Header, Label, Button, styles } from "../src/components/ui";
import { useApp } from "../src/state/store";
import { track } from "../src/analytics";
import { colors } from "../src/design-system/theme";
import { preloadTheme } from "../src/audio";
export default function Onboarding() {
  const [step, setStep] = useState(0),
    settings = useApp((s) => s.profile.settings),
    setSettings = useApp((s) => s.setSettings),
    { t } = useTranslation();
  useEffect(() => {
    track("onboarding_started");
    void preloadTheme("starter");
  }, []);
  return (
    <Screen scroll={false}>
      <Header title="KeyLingo" />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 22,
          paddingBottom: 60,
        }}
      >
        <Text style={styles.eyebrow}>{step === 0 ? "01 / 02" : "02 / 02"}</Text>
        <Text style={styles.title}>
          {t(step === 0 ? "languageTitle" : "studyTitle")}
        </Text>
        <Label muted>{t(step === 0 ? "languageBody" : "studyBody")}</Label>
        <View style={{ gap: 12 }}>
          {(["en", "ko"] as const).map((lang) => (
            <Pressable
              testID={`${step === 0 ? "ui" : "study"}-${lang}`}
              accessibilityRole="button"
              accessibilityLabel={lang === "en" ? "English" : "한국어"}
              key={lang}
              onPress={() => {
                if (step === 0)
                  setSettings({
                    uiLanguage: lang,
                    studyLanguage: lang === "ko" ? "en" : "ko",
                  });
                else {
                  setSettings({ studyLanguage: lang });
                  track("study_language_selected", { language: lang });
                  router.replace("/practice?tutorial=1");
                }
              }}
              style={[
                styles.card,
                styles.spread,
                {
                  minHeight: 78,
                  borderWidth: 2,
                  borderColor:
                    (step === 0
                      ? settings.uiLanguage
                      : settings.studyLanguage) === lang
                      ? colors.primaryStrong
                      : colors.border,
                },
              ]}
            >
              <Text style={styles.subtitle}>
                {lang === "en" ? "English" : "한국어"}
              </Text>
              <Label>
                {(step === 0 ? settings.uiLanguage : settings.studyLanguage) ===
                lang
                  ? "●"
                  : "○"}
              </Label>
            </Pressable>
          ))}
        </View>
        {step === 0 && (
          <Button
            testID="confirm-language"
            title={t("continue")}
            onPress={() => {
              track("ui_language_selected", { language: settings.uiLanguage });
              setStep(1);
            }}
          />
        )}
      </View>
      <Label muted style={{ fontSize: 12, textAlign: "center" }}>
        {t("tagline")}
      </Label>
    </Screen>
  );
}
