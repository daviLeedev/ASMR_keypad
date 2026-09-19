import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { createProfile } from "../../src/state/model";
import { transact } from "../../src/domain";
const output = "artifacts/screenshots/redesign";
for (const language of ["en", "ko"] as const)
  for (const size of [
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ])
    test(`shell hierarchy ${language} ${size.width}`, async ({ page }) => {
      const profile = createProfile(language);
      profile.settings.tutorialCompleted = true;
      await page.addInitScript(
        (p) => localStorage.setItem("keylingo.state.v1", JSON.stringify(p)),
        profile,
      );
      await page.setViewportSize(size);
      fs.mkdirSync(output, { recursive: true });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of [
        "home",
        "play",
        "learn",
        "arcade",
        "collection",
        "keyboard/creamy",
        "progress",
        "settings",
      ]) {
        await page.goto(`/${route}`);
        await expect(
          page
            .getByText("KeyLingo", { exact: true })
            .or(page.getByRole("button"))
            .first(),
        ).toBeVisible();
        if (route === "home") {
          await expect(page.getByTestId("start-learning")).toBeVisible();
          const start = await page.getByTestId("start-learning").boundingBox();
          const nav = await page.getByTestId("bottom-navigation").boundingBox();
          expect(start!.y + start!.height).toBeLessThanOrEqual(nav!.y);
          await expect(page.getByTestId("mode-GUIDED")).toHaveCount(0);
        }
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await expect(
          page.getByTestId("screen-content").filter({ visible: true }).last(),
        ).toHaveCSS("opacity", "1");
        await page.screenshot({
          path: `${output}/${language}-${size.width}-${route.replace("/", "-")}.png`,
        });
      }
      expect(errors).toEqual([]);
    });

test("gallery opens trial, gates purchases and persists an equipped keyboard", async ({
  page,
}) => {
  const profile = createProfile("en");
  profile.settings.tutorialCompleted = true;
  profile.economy = transact(profile.economy, {
    id: "fixture-credit",
    reason: "fixture",
    amount: 350,
    at: new Date().toISOString(),
  });
  await page.addInitScript((p) => {
    if (!localStorage.getItem("keylingo.state.v1"))
      localStorage.setItem("keylingo.state.v1", JSON.stringify(p));
  }, profile);
  await page.goto("/collection");
  await page.getByTestId("theme-creamy").click();
  await expect(page.getByTestId("equip-keyboard")).toBeDisabled();
  await expect(page.getByTestId("level-gate")).toBeVisible();
  await expect(page.getByTestId("token-gate")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByTestId("theme-clicky").click();
  await page.getByTestId("key-ㅂ").click();
  await expect(page.getByTestId("keyboard-trial-input")).toHaveText("ㅂ");
  await page.getByTestId("equip-keyboard").click();
  await expect(page.getByTestId("equip-keyboard")).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId("equip-keyboard")).toHaveText("Equipped");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("keylingo.state.v1")!),
  );
  expect(state.selectedThemeId).toBe("clicky");
  expect(state.economy.balance).toBe(50);
  await page.goto("/collection");
  await page.getByTestId("collection-mine").click();
  await expect(page.getByTestId("theme-clicky")).toBeVisible();
  await expect(page.getByTestId("theme-creamy")).toHaveCount(0);
});

test("physical switch identity and bundled audio credits work offline", async ({
  page,
}) => {
  const profile = createProfile("en");
  profile.settings.tutorialCompleted = true;
  await page.addInitScript(
    (value) => localStorage.setItem("keylingo.state.v1", JSON.stringify(value)),
    profile,
  );
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:8081") externalRequests.push(url.href);
  });

  await page.goto("/keyboard/starter");
  await expect(page.getByText("Brown Tactile", { exact: true })).toBeVisible();
  await expect(page.getByText("Tactile · Rounded · Medium")).toBeVisible();

  await page.goto("/settings");
  await page.getByTestId("open-audio-credits").click();
  await expect(page).toHaveURL(/\/audio-credits$/);
  await expect(page.getByText("kbsim · Kailh Box Navy")).toBeVisible();
  await expect(page.getByText(/MIT · Thomas Lai/).first()).toBeVisible();
  expect(externalRequests).toEqual([]);
});
