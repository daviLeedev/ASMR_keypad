import {
  getTheme,
  keyboardLayout,
  motion,
  themes,
} from "../src/design-system/theme";
import { audioCredits } from "../src/audio/credits";

test("every keyboard theme exposes a complete non-empty 3D surface", () => {
  for (const theme of themes) {
    expect(theme.surface).toEqual(
      expect.objectContaining({
        deckTop: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        deckSide: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        keyTop: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        keySide: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        pressedTop: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        pressedSide: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        legend: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        glow: expect.stringMatching(/^#[0-9A-F]{6}$/i),
      }),
    );
  }
});

test("keyboard sizing remains usable from compact phones through the width cap", () => {
  expect(keyboardLayout.sideInset).toBeGreaterThanOrEqual(4);
  expect(keyboardLayout.keyHeight).toBeGreaterThanOrEqual(
    keyboardLayout.minKeyHeight,
  );
  expect(keyboardLayout.columnGap).toBeGreaterThan(0);
  expect(keyboardLayout.rowGap).toBeGreaterThan(keyboardLayout.columnGap);
  expect(keyboardLayout.maxWidth).toBeGreaterThanOrEqual(320);
  expect(motion.pressMs).toBeLessThan(motion.releaseMs);
  expect(motion.feedbackMs).toBeGreaterThan(motion.releaseMs);
  expect(getTheme("missing").id).toBe("starter");
});

test("every keyboard exposes an honest audio identity and three traits", () => {
  const creditedThemes = new Set(audioCredits.map((credit) => credit.themeId));
  for (const theme of themes) {
    expect(theme.audioIdentity).toEqual(expect.any(String));
    expect(theme.audioIdentity.length).toBeGreaterThan(0);
    expect(theme.audioTraits).toHaveLength(3);
    expect(theme.audioTraits.every(Boolean)).toBe(true);
    if (theme.id !== "silent") expect(creditedThemes).toContain(theme.id);
  }
});
