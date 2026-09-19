import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildPack,
  validatePack,
  normalizeAnswer,
  sha256,
} from "../src/content/pipeline";
import { seedItems } from "../src/content";

const item = {
  id: "water",
  kind: "WORD",
  sourceLanguage: "EN",
  targetLanguage: "KO",
  prompt: "water",
  canonicalAnswer: "물",
  acceptedAnswers: ["물", " 물 "],
  difficulty: "A1",
  category: "food",
  contentPackId: "test",
};
describe("content validation", () => {
  it("normalizes language codes, NFC and duplicate aliases", () => {
    const pack = buildPack(
      { id: "test", version: 1, sourceLanguage: "EN", targetLanguage: "KO" },
      [{ ...item, canonicalAnswer: "물" }],
    );
    expect(pack.items[0].canonicalAnswer).toBe("물");
    expect(pack.items[0].acceptedAnswers).toEqual(["물"]);
    expect(pack.manifest.sourceLanguage).toBe("en");
    expect(normalizeAnswer(" APPLE ", "en")).toBe("apple");
    expect(normalizeAnswer("Hello!", "en")).not.toBe(
      normalizeAnswer("Hello", "en"),
    );
  });
  it("rejects malformed and direction-mismatched content", () => {
    expect(() =>
      buildPack(
        { id: "test", version: 1, sourceLanguage: "en", targetLanguage: "ko" },
        [{ ...item, prompt: " " }],
      ),
    ).toThrow();
    expect(() =>
      buildPack(
        { id: "test", version: 1, sourceLanguage: "ko", targetLanguage: "en" },
        [item],
      ),
    ).toThrow();
  });
  it("removes exact duplicates but rejects conflicting IDs", () => {
    const manifest = {
      id: "test",
      version: 1,
      sourceLanguage: "en",
      targetLanguage: "ko",
    };
    expect(buildPack(manifest, [item, item]).items).toHaveLength(1);
    expect(() =>
      buildPack(manifest, [item, { ...item, prompt: "milk" }]),
    ).toThrow(/conflict/i);
  });
  it("merges semantic aliases without making a repeated original row conflict", () => {
    const original = {
      ...item,
      sourceLanguage: "ko",
      targetLanguage: "en",
      prompt: "큰",
      canonicalAnswer: "big",
      acceptedAnswers: ["big"],
    };
    const alternate = {
      ...original,
      id: "large",
      acceptedAnswers: ["big", "large"],
    };
    const pack = buildPack(
      { id: "test", version: 1, sourceLanguage: "ko", targetLanguage: "en" },
      [original, alternate, original],
    );
    expect(pack.items).toHaveLength(1);
    expect(pack.items[0].acceptedAnswers).toEqual(["big", "large"]);
  });
  it("verifies checksum and item count before importing", () => {
    const pack = buildPack(
      { id: "test", version: 1, sourceLanguage: "en", targetLanguage: "ko" },
      [item],
    );
    expect(validatePack(pack).items).toHaveLength(1);
    expect(() =>
      validatePack({ ...pack, items: [{ ...pack.items[0], prompt: "milk" }] }),
    ).toThrow(/checksum/i);
    expect(() =>
      validatePack({ ...pack, manifest: { ...pack.manifest, itemCount: 2 } }),
    ).toThrow(/count/i);
  });
  it("uses interoperable SHA256 for ASCII and Korean", () => {
    for (const value of [
      "",
      "abc",
      "물과 사과",
      "x".repeat(56),
      "x".repeat(64),
      "사과".repeat(1000),
    ])
      expect(sha256(value)).toBe(
        createHash("sha256").update(value).digest("hex"),
      );
  });
  it("ships bilingual original words, sentences, aliases, and Hangul edge cases", () => {
    for (const targetLanguage of ["ko", "en"]) {
      expect(
        seedItems.filter(
          (i) => i.targetLanguage === targetLanguage && i.kind === "WORD",
        ).length,
      ).toBeGreaterThanOrEqual(60);
      expect(
        seedItems.filter(
          (i) => i.targetLanguage === targetLanguage && i.kind === "SENTENCE",
        ).length,
      ).toBeGreaterThanOrEqual(20);
    }
    expect(seedItems.some((i) => i.acceptedAnswers.length > 1)).toBe(true);
    expect(seedItems.some((i) => i.canonicalAnswer === "닭")).toBe(true);
    expect(new Set(seedItems.map((i) => i.id)).size).toBe(seedItems.length);
  });
  it("CLI accepts a distributable pack and exits nonzero for a corrupted checksum", () => {
    const directory = mkdtempSync(join(tmpdir(), "keylingo-content-")),
      path = join(directory, "pack.json");
    try {
      const pack = buildPack(
        { id: "test", version: 1, sourceLanguage: "en", targetLanguage: "ko" },
        [item],
      );
      writeFileSync(path, JSON.stringify(pack));
      const valid = spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/validate-content.ts", "--input", path],
        { encoding: "utf8" },
      );
      expect(valid.status).toBe(0);
      expect(valid.stdout).toContain("1 verified items");
      writeFileSync(
        path,
        JSON.stringify({
          ...pack,
          manifest: { ...pack.manifest, checksum: "0".repeat(64) },
        }),
      );
      const invalid = spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/validate-content.ts", "--input", path],
        { encoding: "utf8" },
      );
      expect(invalid.status).toBe(1);
      expect(invalid.stderr).toContain("checksum mismatch");
    } finally {
      unlinkSync(path);
      rmdirSync(directory);
    }
  });
});
