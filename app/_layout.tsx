import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import "../src/localization";
import { useApp } from "../src/state/store";
import { Screen, Label, Button } from "../src/components/ui";
import { subscribeReminderOpen } from "../src/services";
import { initializeObservability } from "../src/analytics/bootstrap";
import { AppErrorBoundary } from "../src/components/AppErrorBoundary";
import { useReducedMotion } from "../src/components/useReducedMotion";
initializeObservability();
const query = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
export default function Root() {
  const reducedMotion = useReducedMotion();
  const ready = useApp((s) => s.ready),
    loadError = useApp((s) => s.loadError),
    saveError = useApp((s) => s.saveError),
    hydrate = useApp((s) => s.hydrate),
    { t } = useTranslation();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(
    () =>
      ready
        ? subscribeReminderOpen(() => router.replace("/practice?mode=GUIDED"))
        : undefined,
    [ready],
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={query}>
        <AppErrorBoundary>
          <StatusBar style="dark" />
          {!ready ? (
            <Screen scroll={false}>
              <Label>{t(loadError ? "loadError" : "loading")}</Label>
              {loadError && (
                <Button title={t("retry")} onPress={() => void hydrate()} />
              )}
            </Screen>
          ) : (
            <>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: reducedMotion ? "none" : "slide_from_right",
                  contentStyle: { backgroundColor: "#FFFFFF" },
                }}
              >
                {["home", "play", "collection", "progress"].map((name) => (
                  <Stack.Screen
                    key={name}
                    name={name}
                    options={{
                      animation: reducedMotion ? "none" : "fade",
                      animationDuration: 180,
                    }}
                  />
                ))}
                <Stack.Screen
                  name="result"
                  options={{
                    animation: reducedMotion ? "none" : "fade_from_bottom",
                    animationDuration: 240,
                  }}
                />
              </Stack>
              {saveError && (
                <Button
                  title={t("storageError")}
                  onPress={() => void useApp.getState().persist()}
                />
              )}
            </>
          )}
        </AppErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
