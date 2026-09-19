import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Label,
  Card,
  Button,
  styles,
} from "../src/components/ui";
import { useApp } from "../src/state/store";
import { grantRewardedAd, localDateKey, DEFAULT_TUNING } from "../src/domain";
import { seedItems } from "../src/content";
import { averageSessionWpm } from "../src/state/model";
import { getAdProvider } from "../src/services";
import { track } from "../src/analytics";
import { KeyboardExhibit } from "../src/components/KeyboardExhibit";
import { getTheme } from "../src/design-system/theme";
export default function Result() {
  const result = useApp((s) => s.lastResult),
    p = useApp((s) => s.profile),
    { t } = useTranslation(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const provider = getAdProvider();
  const averageWpm = averageSessionWpm(result?.answers ?? []);
  const resultKind = seedItems.find(
    (item) => item.id === result?.answers[0]?.contentItemId,
  )?.kind;
  const retryRoute = `/practice?mode=${result?.mode ?? "GUIDED"}&kind=${result?.mode === "RAIN" ? "WORD" : (resultKind ?? "WORD")}`;
  const watch = async () => {
    if (busy) return;
    const day = localDateKey(new Date());
    if (
      (p.economy.rewardedAdsByDate[day] ?? 0) >=
      DEFAULT_TUNING.rewardedAdDailyCap
    ) {
      setMessage(t("adLimit"));
      return;
    }
    setBusy(true);
    track("rewarded_ad_offered");
    const receipt = `reward-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const outcome = await provider.showRewardedAd();
      if (outcome === "rewarded") {
        useApp.getState().update((old) => ({
          ...old,
          economy: grantRewardedAd(old.economy, {
            receiptId: receipt,
            completed: true,
            date: localDateKey(new Date()),
            at: new Date().toISOString(),
          }),
        }));
        track("rewarded_ad_completed");
        setMessage("+10 " + t("tokens"));
      } else {
        track("rewarded_ad_failed", { reason: outcome });
        setMessage(t("adFailed"));
      }
    } catch {
      setMessage(t("adFailed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="KeyLingo" />
      <View style={{ paddingTop: 24, gap: 12 }}>
        <Text style={styles.eyebrow}>{t("completed")}</Text>
        <Text style={styles.title}>{t("result")}</Text>
        <Label muted>{t("resultBody")}</Label>
      </View>
      <Card
        style={{
          padding: 22,
          gap: 16,
          borderWidth: 1,
          borderColor: "#D5E5F5",
          shadowOpacity: 0,
        }}
      >
        <View style={styles.spread}>
          <Text
            testID="result-rank"
            style={{ fontSize: 72, fontWeight: "800", color: "#153975" }}
          >
            {result?.rank ?? "C"}
          </Text>
          <View testID="result-rewards" style={{ alignItems: "flex-end" }}>
            <Label style={{ fontWeight: "700", fontSize: 24 }}>
              +{result?.xp ?? 0} XP
            </Label>
            <Label muted>
              +{result?.tokens ?? 0} {t("tokens")}
            </Label>
          </View>
        </View>
        <View style={styles.spread}>
          <Label>
            {result?.correct ?? 0} / {result?.total ?? 0} {t("words")}
          </Label>
          <Label>
            {Math.round(
              result && result.total
                ? Math.max(
                    0,
                    (result.correct / result.total) * 100 - result.mistakes,
                  )
                : 0,
            )}
            % {t("accuracy")}
          </Label>
        </View>
        <Label muted>
          {((result?.durationMs ?? 0) / 1000).toFixed(1)}s · {t("active")}
        </Label>
        {averageWpm !== null && (
          <Label testID="result-wpm" style={{ fontWeight: "700" }}>
            {Math.round(averageWpm)} WPM
          </Label>
        )}
        {result?.mode === "RAIN" && (
          <Label>
            {t("score")} {result.score ?? 0} · {t("best")}{" "}
            {p.best[`rain:${p.settings.studyLanguage}`] ?? 0}
          </Label>
        )}
      </Card>
      {message && <Label>{message}</Label>}
      {result?.tutorial ? (
        <Button
          title={t("firstCollection")}
          onPress={() => router.replace("/collection?welcome=1")}
        />
      ) : (
        <>
          <Button
            testID="retry-session"
            title={t("retry")}
            onPress={() => router.replace(retryRoute)}
          />
          <Button
            testID="result-home"
            secondary
            title={t("home")}
            onPress={() => router.dismissTo("/home")}
          />
          <Button
            secondary
            title={t("explore")}
            onPress={() => router.replace("/collection")}
          />
        </>
      )}
      <View style={{ gap: 4 }}>
        <KeyboardExhibit theme={getTheme(p.selectedThemeId)} compact />
        <Label muted style={{ textAlign: "center", fontSize: 12 }}>
          {t("collectionReward")}
        </Label>
      </View>
      <Button
        secondary
        title={t("rewardAd")}
        disabled={busy || provider.mode === "unavailable"}
        onPress={() => void watch()}
      />
      {provider.mode === "development" && (
        <Label muted style={{ fontSize: 12 }}>
          {t("mockLabel")}
        </Label>
      )}
      <Label muted>{t("dailyLater")}</Label>
    </Screen>
  );
}
