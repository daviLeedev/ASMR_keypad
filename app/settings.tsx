import React, { useState } from "react";
import { View, Text, Switch, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Label,
  Card,
  Button,
  Nav,
  styles,
} from "../src/components/ui";
import { useApp } from "../src/state/store";
import { applyStarterPack } from "../src/state/model";
import {
  getPurchaseProvider,
  scheduleReminder,
  cancelReminder,
} from "../src/services";
import { track } from "../src/analytics";
import { colors } from "../src/design-system/theme";
export default function Settings() {
  const p = useApp((s) => s.profile),
    setSettings = useApp((s) => s.setSettings),
    { t } = useTranslation(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    provider = getPurchaseProvider();
  const offerings = useQuery({
    queryKey: ["offerings", provider.mode],
    queryFn: () => provider.loadOfferings(),
  });
  const schedule = async () => {
    setBusy(true);
    try {
      if (p.settings.reminderEnabled) {
        await cancelReminder();
        setSettings({ reminderEnabled: false });
      } else {
        const ok = await scheduleReminder(
          p.settings.reminderHour,
          p.settings.reminderMinute,
        );
        setSettings({ reminderEnabled: ok });
        setMessage(t(ok ? "reminderOn" : "reminderDenied"));
      }
    } finally {
      setBusy(false);
    }
  };
  const purchase = async (restore = false) => {
    if (busy) return;
    setBusy(true);
    try {
      if (restore) {
        const result = await provider.restore();
        if (result.status === "restored" && result.entitlements.length) {
          for (const e of result.entitlements)
            useApp
              .getState()
              .update((old) => applyStarterPack(old, e.transactionId));
          setMessage(t("purchaseDone"));
        } else setMessage(t("unavailable"));
      } else {
        const offer = offerings.data?.[0];
        if (!offer) {
          setMessage(t("unavailable"));
          return;
        }
        track("purchase_started");
        const result = await provider.purchase(offer.id);
        if (result.status === "purchased" && result.transactionId) {
          useApp
            .getState()
            .update((old) => applyStarterPack(old, result.transactionId!));
          track("purchase_completed");
          setMessage(t("purchaseDone"));
        } else {
          track("purchase_failed");
          setMessage(t("unavailable"));
        }
      }
    } catch {
      setMessage(t("unavailable"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title={t("settings")} />
      <Card>
        {(["soundEnabled", "hapticsEnabled", "reducedMotion"] as const).map(
          (key, i) => (
            <View key={key} style={styles.spread}>
              <Label>{t(["sound", "haptics", "effects"][i])}</Label>
              <Switch
                accessibilityLabel={t(["sound", "haptics", "effects"][i])}
                value={p.settings[key]}
                onValueChange={(v) => setSettings({ [key]: v })}
                trackColor={{ true: colors.primaryStrong }}
              />
            </View>
          ),
        )}
        <Label>{t("volume")}</Label>
        <View style={styles.row}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityLabel={`${t("volume")} ${v * 100}%`}
              onPress={() => setSettings({ volume: v })}
              style={{
                flex: 1,
                minHeight: 44,
                backgroundColor:
                  Math.abs(p.settings.volume - v) < 0.13
                    ? "#C8E7FF"
                    : "#EEF5FB",
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Label style={{ fontSize: 12 }}>{v * 100}%</Label>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.subtitle}>{t("goal")}</Text>
        <View style={styles.row}>
          {([5, 10, 20] as const).map((m) => (
            <View key={m} style={{ flex: 1 }}>
              <Button
                title={`${m} ${t("minutes")}`}
                secondary={p.settings.dailyGoalMinutes !== m}
                onPress={() => setSettings({ dailyGoalMinutes: m })}
              />
            </View>
          ))}
        </View>
        <Label muted>
          {p.habit.streak.streakFreezeCount} {t("freeze")}
        </Label>
      </Card>
      <Card>
        <Text style={styles.subtitle}>{t("reminder")}</Text>
        <View style={styles.spread}>
          <Button
            secondary
            title="−"
            disabled={p.settings.reminderEnabled}
            onPress={() =>
              setSettings({ reminderHour: (p.settings.reminderHour + 23) % 24 })
            }
          />
          <Label>
            {String(p.settings.reminderHour).padStart(2, "0")}:
            {String(p.settings.reminderMinute).padStart(2, "0")}
          </Label>
          <Button
            secondary
            title="+"
            disabled={p.settings.reminderEnabled}
            onPress={() =>
              setSettings({ reminderHour: (p.settings.reminderHour + 1) % 24 })
            }
          />
        </View>
        <Button
          title={t(p.settings.reminderEnabled ? "cancelReminder" : "schedule")}
          disabled={busy}
          onPress={() => void schedule()}
        />
        <Label muted style={{ fontSize: 12 }}>
          {t("notificationHint")}
        </Label>
      </Card>
      <Card>
        <Label>{t("uiLanguage")}</Label>
        <View style={styles.row}>
          {(["en", "ko"] as const).map((lang) => (
            <View key={lang} style={{ flex: 1 }}>
              <Button
                secondary={p.settings.uiLanguage !== lang}
                title={lang === "en" ? "English" : "한국어"}
                onPress={() => setSettings({ uiLanguage: lang })}
              />
            </View>
          ))}
        </View>
        <Label>{t("studyLanguage")}</Label>
        <View style={styles.row}>
          {(["en", "ko"] as const).map((lang) => (
            <View key={lang} style={{ flex: 1 }}>
              <Button
                secondary={p.settings.studyLanguage !== lang}
                title={t(lang === "en" ? "english" : "korean")}
                onPress={() => setSettings({ studyLanguage: lang })}
              />
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.subtitle}>{t("starterPack")}</Text>
        <Label muted>
          Midnight · 500 {t("tokens")} · 2 {t("freeze")}
        </Label>
        {provider.mode === "development" && (
          <Label muted style={{ fontSize: 12 }}>
            {t("mockLabel")}
          </Label>
        )}
        <Button
          title={
            p.starterPackOwned
              ? t("owned")
              : (offerings.data?.[0]?.priceString ?? t("unavailable"))
          }
          disabled={busy || p.starterPackOwned || !offerings.data?.length}
          onPress={() => void purchase()}
        />
        <Button
          secondary
          title={t("restore")}
          disabled={busy}
          onPress={() => void purchase(true)}
        />
      </Card>
      {message && <Label>{message}</Label>}
      <Nav active="settings" />
    </Screen>
  );
}
