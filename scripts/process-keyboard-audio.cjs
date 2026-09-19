const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function argumentsFrom(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error("usage: process-keyboard-audio.cjs --manifest <path> --source <path> --output <path>");
    }
    values[key.slice(2)] = value;
  }
  for (const required of ["manifest", "source", "output"]) {
    if (!values[required]) throw new Error(`missing --${required}`);
  }
  return values;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function durationOf(file) {
  return Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]).trim(),
  );
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function processEntry(entry, sourceRoot, outputRoot) {
  if (!["press", "release"].includes(entry.phase)) {
    throw new Error(`invalid phase for ${entry.source}`);
  }
  if (!["normal", "space", "enter", "backspace"].includes(entry.category)) {
    throw new Error(`invalid category for ${entry.source}`);
  }
  const source = path.resolve(sourceRoot, entry.source);
  const outputRelative = path.join(entry.phase, entry.output).replaceAll("\\", "/");
  const output = path.resolve(outputRoot, outputRelative);
  mkdirSync(path.dirname(output), { recursive: true });

  const sourceDuration = durationOf(source);
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    throw new Error(`could not probe ${source}`);
  }
  const maximum = entry.phase === "press" ? 0.145 : 0.11;
  const targetDuration = Math.min(sourceDuration, maximum);
  const fadeStart = Math.max(0.002, targetDuration - 0.005);
  const filters = [
    "highpass=f=25",
    "silenceremove=start_periods=1:start_duration=0:start_threshold=-52dB",
    `atrim=duration=${targetDuration.toFixed(6)}`,
    "afade=t=in:d=0.002",
    `afade=t=out:st=${fadeStart.toFixed(6)}:d=0.005`,
    "alimiter=limit=0.7079:level=false:latency=true",
  ];
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    source,
    "-af",
    filters.join(","),
    "-ac",
    "1",
    "-ar",
    "48000",
    "-sample_fmt",
    "s16",
    output,
  ]);
  return {
    source: entry.source.replaceAll("\\", "/"),
    phase: entry.phase,
    category: entry.category,
    output: outputRelative,
    sourceSha256: sha256(source),
    sha256: sha256(output),
    filters,
  };
}

function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest);
  const sourceRoot = path.resolve(args.source);
  const outputRoot = path.resolve(args.output);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) {
    throw new Error("manifest.entries must contain explicit source mappings");
  }
  mkdirSync(outputRoot, { recursive: true });
  const files = manifest.entries.map((entry) =>
    processEntry(entry, sourceRoot, outputRoot),
  );
  const provenance = {
    themeId: manifest.themeId,
    identity: manifest.identity,
    source: manifest.source,
    sourceUrl: manifest.sourceUrl,
    commit: manifest.commit,
    license: manifest.license,
    licenseText: manifest.licenseText,
    author: manifest.author,
    downloadedAt: manifest.downloadedAt,
    allowFiveNormalPress: Boolean(manifest.allowFiveNormalPress),
    processing: {
      tool: "ffmpeg",
      format: "mono PCM WAV, 48 kHz, 16-bit",
      notes: manifest.processingNotes,
    },
    files,
  };
  writeFileSync(
    path.join(outputRoot, "provenance.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  console.log(`Processed ${files.length} files into ${outputRoot}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
