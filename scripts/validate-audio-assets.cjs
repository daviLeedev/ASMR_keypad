const { createHash } = require("node:crypto");
const { Buffer } = require("node:buffer");
const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REQUIRED_CATEGORIES = ["normal", "space", "enter", "backspace"];
const PHASES = ["press", "release"];
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

async function probeAudio(file) {
  const raw = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name,channels,sample_rate:format=duration",
    "-of",
    "json",
    file,
  ]);
  const parsed = JSON.parse(raw);
  const stream = parsed.streams?.[0] ?? {};
  const analysis = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const peakMatch = analysis.match(/max_volume:\s*(-?[\d.]+)\s*dB/i);
  const pcm = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-ac",
      "1",
      "-ar",
      "48000",
      "-f",
      "s16le",
      "-",
    ],
    { encoding: null, shell: false },
  );
  if (pcm.status !== 0 || !Buffer.isBuffer(pcm.stdout)) {
    throw new Error(`ffmpeg PCM probe failed: ${String(pcm.stderr)}`);
  }
  const threshold = Math.round(32767 * 10 ** (-52 / 20));
  let firstAudibleSample = pcm.stdout.length / 2;
  for (let offset = 0; offset + 1 < pcm.stdout.length; offset += 2) {
    if (Math.abs(pcm.stdout.readInt16LE(offset)) >= threshold) {
      firstAudibleSample = offset / 2;
      break;
    }
  }
  return {
    codec: stream.codec_name,
    channels: Number(stream.channels),
    sampleRate: Number(stream.sample_rate),
    duration: Number(parsed.format?.duration),
    peakDb: peakMatch ? Number(peakMatch[1]) : Number.NEGATIVE_INFINITY,
    leadingSilence: firstAudibleSample / 48_000,
  };
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function audioFiles(root, phase) {
  const directory = path.join(root, phase);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith(".wav"))
    .map((name) => path.join(directory, name));
}

function categoryFor(file) {
  const name = path.basename(file).toLowerCase();
  return REQUIRED_CATEGORIES.find((category) => name.startsWith(category)) ?? null;
}

async function validatePack(root, options = {}) {
  const issues = [];
  const provenancePath = path.join(root, "provenance.json");
  let provenance = null;
  try {
    provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
  } catch {
    issues.push({ code: "PROVENANCE_MISSING", file: provenancePath });
  }

  const filesByPhase = Object.fromEntries(
    PHASES.map((phase) => [phase, audioFiles(root, phase)]),
  );
  for (const phase of PHASES) {
    for (const category of REQUIRED_CATEGORIES) {
      const count = filesByPhase[phase].filter(
        (file) => categoryFor(file) === category,
      ).length;
      const minimum =
        phase === "press" && category === "normal"
          ? provenance?.allowFiveNormalPress
            ? 5
            : 6
          : 1;
      if (count < minimum) {
        issues.push({
          code: "CATEGORY_MISSING",
          file: `${phase}/${category}`,
          message: `expected at least ${minimum}, found ${count}`,
        });
      }
    }
  }

  const probe = options.probe ?? probeAudio;
  for (const phase of PHASES) {
    for (const file of filesByPhase[phase]) {
      let metadata;
      try {
        metadata = await probe(file);
      } catch (error) {
        issues.push({ code: "PROBE_FAILED", file, message: String(error) });
        continue;
      }
      if (
        metadata.codec !== "pcm_s16le" ||
        metadata.channels !== 1 ||
        metadata.sampleRate !== 48_000
      ) {
        issues.push({ code: "FORMAT_UNSUPPORTED", file });
      }
      if (metadata.leadingSilence > 0.0031) {
        issues.push({ code: "LEADING_SILENCE", file });
      }
      if (metadata.peakDb > -2.95) {
        issues.push({ code: "PEAK_TOO_HIGH", file });
      }
      const maximum =
        provenance?.themeId === "retro" ? 0.4 : phase === "press" ? 0.1455 : 0.1105;
      const minimum = phase === "press" ? 0.02 : 0.01;
      if (
        !Number.isFinite(metadata.duration) ||
        metadata.duration < minimum ||
        metadata.duration > maximum
      ) {
        issues.push({ code: "DURATION_OUT_OF_RANGE", file });
      }
    }
  }

  if (provenance) {
    const required = [
      "themeId",
      "source",
      "sourceUrl",
      "commit",
      "license",
      "author",
      "downloadedAt",
      "files",
    ];
    if (required.some((key) => !provenance[key])) {
      issues.push({ code: "PROVENANCE_MISSING", file: provenancePath });
    }
    const records = Array.isArray(provenance.files) ? provenance.files : [];
    const recordedOutputs = new Set(
      records
        .map((record) =>
          typeof record.output === "string"
            ? record.output.replaceAll("\\", "/")
            : null,
        )
        .filter(Boolean),
    );
    for (const file of Object.values(filesByPhase).flat()) {
      const relative = path.relative(root, file).replaceAll("\\", "/");
      if (!recordedOutputs.has(relative)) {
        issues.push({ code: "PROVENANCE_FILE_UNLISTED", file });
      }
    }
    for (const record of records) {
      const output = path.resolve(root, record.output ?? "");
      const relative = path.relative(root, output).replaceAll("\\", "/");
      const isInsideRoot = relative !== ".." && !relative.startsWith("../");
      if (
        !SHA256_PATTERN.test(record.sourceSha256 ?? "") ||
        !SHA256_PATTERN.test(record.sha256 ?? "")
      ) {
        issues.push({ code: "PROVENANCE_HASH_MISSING", file: output });
      }
      if (!isInsideRoot || !existsSync(output) || !statSync(output).isFile()) {
        issues.push({ code: "PROVENANCE_FILE_MISSING", file: output });
      } else if (
        SHA256_PATTERN.test(record.sha256 ?? "") &&
        sha256(output) !== record.sha256
      ) {
        issues.push({ code: "HASH_MISMATCH", file: output });
      }
    }
  }
  return issues;
}

async function main() {
  const root = path.resolve(process.argv[2] ?? "assets/audio");
  const configPath = path.join(root, "validation.json");
  const config = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, "utf8"))
    : { legacyThemes: [] };
  const legacy = new Set(config.legacyThemes ?? []);
  const themes = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const issues = [];
  for (const theme of themes) {
    if (legacy.has(theme)) {
      console.log(`LEGACY ${theme}: validation deferred`);
      continue;
    }
    const themeIssues = await validatePack(path.join(root, theme));
    issues.push(...themeIssues.map((issue) => ({ ...issue, theme })));
  }
  if (issues.length) {
    for (const issue of issues) {
      console.error(`${issue.theme ?? "pack"} ${issue.code} ${issue.file ?? ""}`.trim());
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${themes.length - legacy.size} physical audio pack(s); ${legacy.size} legacy theme(s).`);
}

module.exports = { validatePack, probeAudio };
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
