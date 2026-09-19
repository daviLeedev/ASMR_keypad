import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Label, Button, styles } from "../src/components/ui";
import { ShellHeader, PageIntro, shell } from "../src/components/Shell";
import { KeyboardExhibit } from "../src/components/KeyboardExhibit";
import { themes, colors } from "../src/design-system/theme";
import { useApp } from "../src/state/store";
import { track } from "../src/analytics";
export default function Collection() {
  const p = useApp((s) => s.profile),
    { t } = useTranslation(),
    { welcome } = useLocalSearchParams();
  const [mine, setMine] = useState(false);
  const visible = themes.filter(
    (theme) => !mine || p.economy.unlockedThemeIds.includes(theme.id),
  );
  return (
    <Screen active="collection">
      <ShellHeader title={t("collection")} />
      <PageIntro
        eyebrow={t("showroom")}
        title={t("collectionTitle")}
        body={t("collectionSubtitle")}
      />
      {welcome && (
        <Button
          title={t("previewContinue")}
          onPress={() => router.replace("/home")}
        />
      )}
      <View style={styles.spread}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              testID={value ? "collection-mine" : "collection-all"}
              accessibilityRole="button"
              accessibilityState={{ selected: value === mine }}
              onPress={() => setMine(value)}
              style={[
                shell.pill,
                {
                  paddingHorizontal: 12,
                  backgroundColor:
                    value === mine ? colors.navy : colors.background,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: value === mine ? "white" : colors.navy,
                }}
              >
                {t(value ? "myBoards" : "allBoards")}
              </Text>
            </Pressable>
          ))}
        </View>
        <Label style={{ fontSize: 12 }}>{p.economy.balance} ◇</Label>
      </View>
      {!visible.length && <Label muted>{t("emptyCollection")}</Label>}
      {visible.map((theme, index) => {
        const owned = p.economy.unlockedThemeIds.includes(theme.id);
        return (
          <Pressable
            key={theme.id}
            testID={`theme-${theme.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${theme.name} · ${t("details")}`}
            onPress={() => {
              track("keyboard_previewed", { themeId: theme.id });
              router.push(`/keyboard/${theme.id}`);
            }}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingBottom: 24,
              gap: 10,
            }}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 16,
                paddingVertical: 8,
              }}
            >
              <KeyboardExhibit theme={theme} />
            </View>
            <View style={styles.spread}>
              <Text style={styles.eyebrow}>
                {t("edition")} / {String(index + 1).padStart(2, "0")}
              </Text>
              <Label style={{ fontSize: 12 }}>
                {t(
                  p.selectedThemeId === theme.id
                    ? "equipped"
                    : owned
                      ? "owned"
                      : "locked",
                )}
              </Label>
            </View>
            <View style={styles.spread}>
              <Text style={[styles.title, { fontSize: 26 }]}>{theme.name}</Text>
              <Text style={shell.arrow}>↗</Text>
            </View>
            <Label muted>{theme.descriptor}</Label>
            {!owned && (
              <Label style={{ fontSize: 12 }}>
                {theme.tokenCost} ◇ · {t("level")} {theme.unlockLevel}
              </Label>
            )}
          </Pressable>
        );
      })}
    </Screen>
  );
}
