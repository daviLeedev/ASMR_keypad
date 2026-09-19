import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

// CommonJS is intentional: the production validator is also a directly runnable CLI.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validatePack } = require("../scripts/validate-audio-assets.cjs") as {
  validatePack: (
    root: string,
    options?: { probe?: (file: string) => Promise<AudioMetadata> },
  ) => Promise<{ code: string; file?: string }[]>;
};

interface AudioMetadata {
  codec: string;
  channels: number;
  sampleRate: number;
  duration: number;
  peakDb: number;
  leadingSilence: number;
}

const validMetadata: AudioMetadata = {
  codec: "pcm_s16le",
  channels: 1,
  sampleRate: 48_000,
  duration: 0.08,
  peakDb: -3.2,
  leadingSilence: 0.002,
};

async function touch(root: string, relative: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "sentinel");
}

describe("keyboard audio asset validation", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "keylingo-audio-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test("reports provenance, format, timing, peak, and category failures", async () => {
    await touch(root, "press/normal_01.wav");
    const issues = await validatePack(root, {
      probe: async () => ({
        codec: "mp3",
        channels: 2,
        sampleRate: 44_100,
        duration: 0.3,
        peakDb: -0.2,
        leadingSilence: 0.02,
      }),
    });
    const codes = issues.map((issue) => issue.code);

    expect(codes).toContain("PROVENANCE_MISSING");
    expect(codes).toContain("FORMAT_UNSUPPORTED");
    expect(codes).toContain("LEADING_SILENCE");
    expect(codes).toContain("PEAK_TOO_HIGH");
    expect(codes).toContain("DURATION_OUT_OF_RANGE");
    expect(codes).toContain("CATEGORY_MISSING");
  });

  test("accepts the five genuine Brown press variants and all key phases", async () => {
    const files = [
      ...Array.from({ length: 5 }, (_, index) =>
        `press/normal_${String(index + 1).padStart(2, "0")}.wav`,
      ),
      "release/normal_01.wav",
      "press/space_01.wav",
      "release/space_01.wav",
      "press/enter_01.wav",
      "release/enter_01.wav",
      "press/backspace_01.wav",
      "release/backspace_01.wav",
    ];
    await Promise.all(files.map((file) => touch(root, file)));
    await writeFile(
      path.join(root, "provenance.json"),
      JSON.stringify({
        themeId: "starter",
        source: "cjlangan/MechSim mxbrown-travel",
        sourceUrl: "https://github.com/cjlangan/MechSim",
        commit: "b5ea4665a41ee1aa2241ef889b26a33a56e14ed3",
        license: "MIT",
        author: "MechSim contributors",
        downloadedAt: "2026-09-19T00:00:00.000Z",
        allowFiveNormalPress: true,
        files: files.map((file) => ({
          output: file,
          sourceSha256: createHash("sha256").update(`source:${file}`).digest("hex"),
          sha256: createHash("sha256").update("sentinel").digest("hex"),
        })),
      }),
    );

    await expect(
      validatePack(root, { probe: async () => validMetadata }),
    ).resolves.toEqual([]);
  });

  test("rejects unlisted outputs and provenance records without both hashes", async () => {
    const files = [
      ...Array.from({ length: 6 }, (_, index) =>
        `press/normal_${String(index + 1).padStart(2, "0")}.wav`,
      ),
      "release/normal_01.wav",
      "press/space_01.wav",
      "release/space_01.wav",
      "press/enter_01.wav",
      "release/enter_01.wav",
      "press/backspace_01.wav",
      "release/backspace_01.wav",
    ];
    await Promise.all(files.map((file) => touch(root, file)));
    await writeFile(
      path.join(root, "provenance.json"),
      JSON.stringify({
        themeId: "starter",
        source: "example/source",
        sourceUrl: "https://example.com/source",
        commit: "0123456789abcdef",
        license: "MIT",
        author: "Example author",
        downloadedAt: "2026-09-19T00:00:00.000Z",
        files: files.slice(0, -1).map((file, index) => ({
          output: file,
          sourceSha256:
            index === 0
              ? undefined
              : createHash("sha256").update(`source:${file}`).digest("hex"),
          sha256: createHash("sha256").update("sentinel").digest("hex"),
        })),
      }),
    );

    const issues = await validatePack(root, {
      probe: async () => validMetadata,
    });
    const codes = issues.map((issue) => issue.code);

    expect(codes).toContain("PROVENANCE_FILE_UNLISTED");
    expect(codes).toContain("PROVENANCE_HASH_MISSING");
  });
});
