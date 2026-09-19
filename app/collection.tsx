import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Label,
  Button,
  Nav,
  styles,
} from "../src/components/ui";
import { Keyboard } from "../src/components/Keyboard";
import { themes, getTheme, colors } from "../src/design-system/theme";
import { useApp } from "../src/state/store";
import { levelForXp, unlockTheme } from "../src/domain";
import { track } from "../src/analytics";
export default function Collection() {
  const p = useApp((s) => s.profile),
    { t } = useTranslation(),
    { welcome } = useLocalSearchParams(),
    [selected, setSelected] = useState(p.selectedThemeId),
    [message, setMessage] = useState("");
  const theme = getTheme(selected),
    owned = p.economy.unlockedThemeIds.includes(selected);
  const use = () => {
    try {
      useApp.getState().update((old) => ({
        ...old,
        economy: unlockTheme(
          old.economy,
          theme,
          levelForXp(old.xp),
          new Date().toISOString(),
        ),
        selectedThemeId: selected,
      }));
      if (!owned) track("keyboard_unlocked", { themeId: selected });
      track("keyboard_equipped", { themeId: selected });
      setMessage(t("equipped"));
    } catch {
      setMessage(t("notEnough"));
    }
  };
  return (
    <Screen>
      <Header
        title={t("collection")}
        right={<Text style={styles.badge}>{p.economy.balance} ◇</Text>}
      />
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>{theme.name}</Text>
        <Label muted>{theme.descriptor}</Label>
        <Label>{t("shopBody")}</Label>
      </View>
      <View testID="theme-preview-keyboard" style={{ borderRadius: 24 }}>
        <Keyboard
          height={240}
          language={p.settings.studyLanguage}
          themeId={selected}
          settings={p.settings}
          onKey={() => {}}
        />
      </View>
      <Label muted style={{ fontSize: 12, textAlign: "center" }}>
        {t("previewHint")}
      </Label>
      <View style={styles.spread}>
        <Label>
          {owned
            ? t("owned")
            : `${theme.tokenCost} ◇ · ${t("level")} ${theme.unlockLevel}`}
        </Label>
        <Label muted>
          {selected === p.selectedThemeId ? t("equipped") : ""}
        </Label>
      </View>
      <Button
        title={t(owned ? "equip" : "unlock")}
        disabled={selected === p.selectedThemeId}
        onPress={use}
      />
      {message && <Label>{message}</Label>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {themes.map((th) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={th.name}
            testID={`theme-${th.id}`}
            key={th.id}
            onPress={() => {
              setSelected(th.id);
              setMessage("");
              track("keyboard_previewed", { themeId: th.id });
            }}
            style={{
              width: "48%",
              borderRadius: 15,
              backgroundColor: th.surface.deckTop,
              padding: 15,
              minHeight: 90,
              borderWidth: 2,
              borderColor:
                selected === th.id ? colors.primaryStrong : "transparent",
            }}
          >
            <View style={{ flexDirection: "row", gap: 4, marginBottom: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    height: 19,
                    flex: 1,
                    backgroundColor:
                      i === 3 ? th.surface.pressedTop : th.surface.keyTop,
                    borderBottomWidth: 3,
                    borderBottomColor: th.surface.keySide,
                    borderRadius: 4,
                  }}
                />
              ))}
            </View>
            <Text style={{ color: th.ink, fontSize: 13, fontWeight: "600" }}>
              {th.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {welcome && (
        <Button
          title={t("previewContinue")}
          onPress={() => router.replace("/home")}
        />
      )}
      <Nav active="collection" />
    </Screen>
  );
}
