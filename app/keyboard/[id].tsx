import React, { useState } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Header, Label, Button, styles } from "../../src/components/ui";
import { PageIntro, shell } from "../../src/components/Shell";
import { Keyboard } from "../../src/components/Keyboard";
import { themes } from "../../src/design-system/theme";
import { useApp } from "../../src/state/store";
import { levelForXp, unlockTheme, compose } from "../../src/domain";
import { track } from "../../src/analytics";
export default function KeyboardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { t } = useTranslation();
  const p = useApp((s) => s.profile),
    [message, setMessage] = useState(""),
    [keys, setKeys] = useState<string[]>([]);
  const theme = themes.find((candidate) => candidate.id === id);
  if (!theme)
    return (
      <Screen>
        <Header title={t("collection")} back parent="/collection" />
        <Label>{t("detailUnavailable")}</Label>
        <Button
          title={t("backCollection")}
          onPress={() => router.replace("/collection")}
        />
      </Screen>
    );
  const owned = p.economy.unlockedThemeIds.includes(theme.id),
    equipped = p.selectedThemeId === theme.id;
  const level = levelForXp(p.xp),
    enoughLevel = level >= theme.unlockLevel,
    shortfall = Math.max(0, theme.tokenCost - p.economy.balance);
  const useKeyboard = () => {
    try {
      useApp
        .getState()
        .update((old) => ({
          ...old,
          economy: unlockTheme(
            old.economy,
            theme,
            levelForXp(old.xp),
            new Date().toISOString(),
          ),
          selectedThemeId: theme.id,
        }));
      if (!owned) track("keyboard_unlocked", { themeId: theme.id });
      track("keyboard_equipped", { themeId: theme.id });
      setMessage(t("equipped"));
    } catch {
      setMessage(t("notEnough"));
    }
  };
  return (
    <Screen>
      <Header
        title={t("collection")}
        back
        parent="/collection"
        right={<Label>{p.economy.balance} ◇</Label>}
      />
      <PageIntro
        eyebrow={t("soundStudio")}
        title={theme.name}
        body={theme.descriptor}
      />
      <View style={{ gap: 4 }}>
        <Text style={styles.subtitle}>{theme.audioIdentity}</Text>
        <Label muted>{theme.audioTraits.join(" · ")}</Label>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={styles.subtitle}>{t("tryBoard")}</Text>
        <Label muted>{t("glideHint")}</Label>
        <View
          style={{
            minHeight: 38,
            borderBottomWidth: 1,
            borderBottomColor: "#D5E5F5",
          }}
        >
          <Label testID="keyboard-trial-input">
            {keys.length
              ? p.settings.studyLanguage === "ko"
                ? compose(keys)
                : keys.join("")
              : "│"}
          </Label>
        </View>
      </View>
      <View testID="theme-preview-keyboard" style={{ marginHorizontal: -16 }}>
        <Keyboard
          height={222}
          language={p.settings.studyLanguage}
          themeId={theme.id}
          settings={p.settings}
          onKey={(key) =>
            setKeys((old) =>
              key === "BACKSPACE" ? old.slice(0, -1) : [...old, key].slice(-24),
            )
          }
        />
      </View>
      {!p.settings.soundEnabled && (
        <Button
          secondary
          title={t("enableSound")}
          onPress={() => useApp.getState().setSettings({ soundEnabled: true })}
        />
      )}
      <View style={{ gap: 12 }}>
        <View style={styles.spread}>
          <Label muted>{t(owned ? "owned" : "cost")}</Label>
          <Label>
            {owned
              ? t(equipped ? "equipped" : "owned")
              : `${theme.tokenCost} ◇`}
          </Label>
        </View>
        {!owned && (
          <>
            <View style={styles.spread}>
              <Label muted>{t("requiredLevel")}</Label>
              <Label>
                {t("level")} {theme.unlockLevel}
              </Label>
            </View>
            {!enoughLevel && (
              <Label testID="level-gate">
                {t("needLevel", { level: theme.unlockLevel })}
              </Label>
            )}
            {shortfall > 0 && (
              <Label testID="token-gate">
                {t("needTokens", { count: shortfall })}
              </Label>
            )}
          </>
        )}
        <Button
          testID="equip-keyboard"
          title={t(equipped ? "equipped" : owned ? "equip" : "unlock")}
          disabled={equipped || (!owned && (!enoughLevel || shortfall > 0))}
          onPress={useKeyboard}
        />
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {message}
          </Text>
        )}
      </View>
      <View style={shell.divider} />
      <Label muted style={{ fontSize: 12, textAlign: "center" }}>
        {t("cosmetic")}
      </Label>
    </Screen>
  );
}
