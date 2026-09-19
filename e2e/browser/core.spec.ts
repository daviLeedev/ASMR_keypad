import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { seedItems } from "../../src/content";
import { createProfile } from "../../src/state/model";
import { createMastery } from "../../src/domain";
const output = path.resolve("artifacts/screenshots");
async function type(page: Page, keys: string[]) {
  for (const k of keys) await page.getByTestId(`key-${k}`).click();
}
async function onboard(page: Page, language: "en" | "ko") {
  await page.goto("/");
  await page.getByTestId("ui-en").click();
  await page.getByTestId("confirm-language").click();
  await page.getByTestId(`study-${language}`).click();
}
async function fit(page: Page) {
  const viewport = page.viewportSize()!;
  const board = await page.getByTestId("virtual-keyboard").boundingBox();
  expect(board).not.toBeNull();
  expect(board!.x).toBeGreaterThanOrEqual(4);
  expect(viewport.width - board!.x - board!.width).toBeGreaterThanOrEqual(4);
  expect(board!.width / viewport.width).toBeGreaterThanOrEqual(0.94);
  expect(board!.y + board!.height).toBeLessThanOrEqual(viewport.height);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight,
  );
  expect(overflow).toBe(false);
}
test("English tutorial, hidden recall, reward, collection, persistence and settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page, "en");
  await fit(page);
  await expect(page.getByTestId("ghost-suffix")).toHaveText("apple");
  await type(page, ["a"]);
  await expect(page.getByTestId("ghost-suffix")).toHaveText("pple");
  await type(page, ["p", "p", "l", "e"]);
  await page.getByTestId("next-answer").click();
  await type(page, [..."water"]);
  await page.getByTestId("next-answer").click();
  await expect(page.getByTestId("ghost-suffix")).toHaveCount(0);
  await expect(page.getByTestId("answer-region")).not.toContainText("apple");
  await type(page, [..."apple"]);
  await page.getByTestId("next-answer").click();
  await expect(page.getByText("Practice, made progress.")).toBeVisible();
  await expect(page.getByTestId("result-rank")).toBeVisible();
  await expect(page.getByTestId("result-rewards")).toBeVisible();
  fs.mkdirSync(output, { recursive: true });
  await page.screenshot({ path: path.join(output, "result-375x667.png") });
  await page.getByRole("button", { name: "Meet your first keyboard" }).click();
  await expect(page.getByTestId("theme-starter")).toBeVisible();
  await page.getByTestId("theme-creamy").click();
  await expect(page.getByTestId("theme-preview-keyboard")).toBeVisible();
  await expect(
    page.getByText("Creamy", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({ path: path.join(output, "collection-375x667.png") });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Make it a daily rhythm" }).click();
  await expect(page.getByTestId("start-learning")).toBeVisible();
  await expect(page.getByTestId("daily-progress")).toBeVisible();
  await expect(page.getByTestId("start-learning")).toBeVisible();
  await expect(page.getByTestId("mode-GUIDED")).toHaveCount(0);
  await expect(page.getByTestId("nav-play")).toBeVisible();
  const startBox = await page.getByTestId("start-learning").boundingBox();
  expect(startBox).not.toBeNull();
  expect(startBox!.y + startBox!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page.screenshot({ path: path.join(output, "home-375x667.png") });
  await page.reload();
  await expect(page.getByTestId("start-learning")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText("Your daily goal")).toBeVisible();
  const sound = page.getByRole("switch", { name: "Sound" });
  const previousSound = await sound.isChecked();
  await sound.click();
  await page.reload();
  if (previousSound)
    await expect(page.getByRole("switch", { name: "Sound" })).not.toBeChecked();
  else await expect(page.getByRole("switch", { name: "Sound" })).toBeChecked();
  await page.screenshot({ path: path.join(output, "settings-375x667.png") });
  expect(errors).toEqual([]);
});
for (const size of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
])
  for (const language of ["en", "ko"] as const)
    test(`visual ${language} ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await onboard(page, language);
      await fit(page);
      fs.mkdirSync(output, { recursive: true });
      await page.screenshot({
        path: path.join(
          output,
          `${language}-${size.width}x${size.height}-guided.png`,
        ),
      });
      if (language === "ko") {
        await type(page, ["ㅅ", "ㅏ", "ㄱ", "ㅗ", "ㅏ"]);
        await page.getByTestId("next-answer").click();
        await type(page, ["ㅁ", "ㅜ", "ㄹ"]);
      } else {
        await type(page, [..."apple"]);
        await page.getByTestId("next-answer").click();
        await type(page, [..."water"]);
      }
      await page.getByTestId("next-answer").click();
      await expect(page.getByTestId("ghost-suffix")).toHaveCount(0);
      await fit(page);
      await page.screenshot({
        path: path.join(
          output,
          `${language}-${size.width}x${size.height}-recall.png`,
        ),
      });
    });

async function completeTutorial(page: Page) {
  await onboard(page, "en");
  for (const answer of ["apple", "water", "apple"]) {
    await type(page, [...answer]);
    await page.getByTestId("next-answer").click();
  }
}
async function homeFromResult(page: Page, tutorial = false) {
  if (!tutorial) {
    await expect(page.getByTestId("retry-session")).toBeVisible();
    await expect(page.getByTestId("result-home")).toBeVisible();
    await page.getByTestId("result-home").click();
    return;
  }
  await page
    .getByRole("button", {
      name: tutorial ? "Meet your first keyboard" : "Keep practicing",
      exact: true,
    })
    .click();
  if (tutorial)
    await page.getByRole("button", { name: "Make it a daily rhythm" }).click();
}
test("offline recall unlocks speed and rain; full 60-second round completes", async ({
  page,
  context,
}) => {
  await completeTutorial(page);
  await homeFromResult(page, true);
  await context.setOffline(true);
  for (let run = 0; run < 2; run++) {
    await page.getByTestId("nav-play").filter({ visible: true }).click();
    await page.getByTestId("open-learning").filter({ visible: true }).click();
    await page.getByTestId("mode-RECALL").filter({ visible: true }).click();
    for (let i = 0; i < 2; i++) {
      const prompt = await page.getByTestId("prompt").innerText();
      await expect(page.getByTestId("ghost-suffix")).toHaveCount(0);
      await type(page, [...(prompt === "사과" ? "apple" : "water")]);
      await page.getByTestId("next-answer").click();
    }
    await homeFromResult(page);
  }
  await page.getByTestId("nav-play").filter({ visible: true }).click();
  await page.getByTestId("open-arcade").filter({ visible: true }).click();
  await page.getByTestId("mode-SPEED").click();
  await expect(page.getByTestId("ghost-suffix")).toHaveCount(0);
  for (let i = 0; i < 2; i++) {
    const prompt = await page.getByTestId("prompt").innerText();
    await type(page, [...(prompt === "사과" ? "apple" : "water")]);
    await page.getByTestId("next-answer").click();
  }
  await homeFromResult(page);
  await page.getByTestId("nav-play").filter({ visible: true }).click();
  await page.getByTestId("open-arcade").filter({ visible: true }).click();
  await page.getByTestId("mode-RAIN").filter({ visible: true }).click();
  await fit(page);
  await page.clock.install();
  await page.getByTestId("start-rain").click();
  await page.clock.runFor(100);
  const prompt = await page.getByTestId("rain-prompt").first().innerText();
  await type(page, [...(prompt === "사과" ? "apple" : "water")]);
  await expect(page.getByTestId("rain-input")).not.toContainText("apple");
  await page.clock.runFor(8000);
  await page.screenshot({ path: path.join(output, "en-375x667-rain.png") });
  await page.clock.runFor(52000);
  await expect(page.getByText("Practice, made progress.")).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("keylingo.state.v1")!),
  );
  expect(state.sessions.at(-1).mode).toBe("RAIN");
  expect(Object.keys(state.best).length).toBeGreaterThan(0);
});
test("sentences are reachable with space and punctuation at the smallest size", async ({
  page,
}) => {
  await completeTutorial(page);
  await homeFromResult(page, true);
  await page.getByTestId("nav-play").click();
  await page.getByTestId("open-learning").click();
  await page.getByTestId("sentence-mode").click();
  await page.getByTestId("mode-GUIDED").click();
  await fit(page);
  await expect(page.getByTestId("key-space")).toBeVisible();
  const answer = await page.getByTestId("ghost-suffix").innerText();
  await page.screenshot({ path: path.join(output, "en-375x667-sentence.png") });
  for (const letter of answer.toLowerCase())
    await page
      .getByTestId(letter === " " ? "key-space" : `key-${letter}`)
      .click();
  await expect(page.getByTestId("next-answer")).toBeVisible();
});
test("optional mock ad cap and starter purchase restore are idempotent", async ({
  page,
}) => {
  await completeTutorial(page);
  for (let n = 0; n < 4; n++)
    await page
      .getByRole("button", { name: "Optional reward · +10 Tokens" })
      .click();
  await expect(page.getByText("Daily reward limit reached.")).toBeVisible();
  await homeFromResult(page, true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "DEV · FREE TEST", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore purchases", exact: true })
    .click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("keylingo.state.v1")!),
  );
  expect(
    state.economy.ledger.filter(
      (l: { reason: string }) => l.reason === "REWARDED_AD",
    ),
  ).toHaveLength(3);
  expect(
    state.economy.ledger.filter(
      (l: { reason: string }) => l.reason === "starter_pack",
    ),
  ).toHaveLength(1);
  expect(state.starterPackOwned).toBe(true);
});
for (const language of ["en", "ko"] as const)
  for (const size of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ])
    test(`long sentence ${language} ${size.width}x${size.height}`, async ({
      page,
    }) => {
      const items = seedItems.filter(
        (i) => i.targetLanguage === language && i.kind === "SENTENCE",
      );
      const longest = [...items].sort(
        (a, b) => b.canonicalAnswer.length - a.canonicalAnswer.length,
      )[0];
      const fixture = createProfile(language === "en" ? "ko" : "en");
      fixture.settings.tutorialCompleted = true;
      for (const item of items)
        if (item.id !== longest.id)
          fixture.mastery[item.id] = {
            ...createMastery(item.id),
            seenCount: 1,
            wrongCount: 1,
          };
      await page.addInitScript(
        (profile) =>
          localStorage.setItem("keylingo.state.v1", JSON.stringify(profile)),
        fixture,
      );
      await page.setViewportSize(size);
      await page.goto("/practice?mode=GUIDED&kind=SENTENCE");
      await fit(page);
      await expect(page.getByTestId("ghost-suffix")).toHaveText(
        longest.canonicalAnswer,
      );
      const prompt = await page.getByTestId("prompt").boundingBox(),
        answer = await page.getByTestId("answer-region").boundingBox();
      expect(prompt!.y + prompt!.height).toBeLessThanOrEqual(answer!.y + 1);
      await page.screenshot({
        path: path.join(
          output,
          `${language}-${size.width}x${size.height}-long-sentence.png`,
        ),
      });
    });

test("sentence error feedback fits above actions at 320x568", async ({
  page,
}) => {
  const items = seedItems.filter(
    (item) => item.targetLanguage === "ko" && item.kind === "SENTENCE",
  );
  const longest = [...items].sort(
    (a, b) => b.canonicalAnswer.length - a.canonicalAnswer.length,
  )[0];
  const fixture = createProfile("en");
  fixture.settings.tutorialCompleted = true;
  for (const item of items)
    if (item.id !== longest.id)
      fixture.mastery[item.id] = {
        ...createMastery(item.id),
        seenCount: 1,
        wrongCount: 1,
      };
  await page.addInitScript(
    (profile) =>
      localStorage.setItem("keylingo.state.v1", JSON.stringify(profile)),
    fixture,
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/practice?mode=GUIDED&kind=SENTENCE");
  await page.getByTestId("key-ㅋ").click();
  await page.getByTestId("submit-answer").click();

  const progress = await page.getByTestId("practice-progress").boundingBox();
  const status = await page.getByTestId("practice-status").boundingBox();
  const feedback = await page.getByTestId("answer-feedback").boundingBox();
  const next = await page.getByTestId("next-answer").boundingBox();
  expect(progress!.y + progress!.height).toBeLessThanOrEqual(status!.y);
  expect(feedback!.y + feedback!.height).toBeLessThanOrEqual(next!.y);
  await fit(page);
});
test("Korean in-progress syllables retain their ghost and fast repeated presses are not lost", async ({
  page,
}) => {
  await onboard(page, "ko");
  await type(page, ["ㅅ"]);
  await expect(page.getByTestId("ghost-suffix")).toHaveText("사과");
  await expect(page.getByTestId("composing-jamo")).toHaveText("ㅅ");
  await type(page, ["ㅏ", "ㄱ"]);
  await expect(page.getByTestId("ghost-suffix")).toHaveText("과");
  await expect(page.getByTestId("composing-jamo")).toHaveText("ㄱ");
  await page.screenshot({
    path: path.join(output, "ko-375x667-composing.png"),
  });
  await type(page, ["ㅗ", "ㅏ"]);
  await expect(page.getByTestId("next-answer")).toBeVisible();
});

test("paused keyboard does not change the answer", async ({ page }) => {
  await onboard(page, "en");
  const answer = page.getByTestId("answer-region");
  const before = await answer.innerText();
  await page.getByRole("button", { name: "Leave practice" }).click();
  await page.getByTestId("key-a").dispatchEvent("pointerdown");
  await expect(answer).toHaveText(before);
});

test("recall hint is partial and wrong submission reveals correction without breaking layout", async ({
  page,
}) => {
  await onboard(page, "en");
  for (const answer of ["apple", "water"]) {
    await type(page, [...answer]);
    await page.getByTestId("next-answer").click();
  }
  await page.getByRole("button", { name: "A little hint" }).click();
  await expect(page.getByTestId("answer-region")).not.toContainText("apple");
  await expect(page.getByText("a… · Hint used · reduced reward")).toBeVisible();
  await type(page, ["z", "z"]);
  await page.getByTestId("submit-answer").click();
  await expect(page.getByTestId("correction")).toHaveText("apple");
  await fit(page);
  await page.getByTestId("next-answer").click();
  const profile = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("keylingo.state.v1")!),
  );
  expect(profile.sessions[0].hints).toBe(1);
  expect(profile.sessions[0].correct).toBe(2);
});
