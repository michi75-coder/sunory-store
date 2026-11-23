// Turns a simulator recording into an App Store app preview: 886 × 1920 (the 6.9-inch iPhone's
// size, also taken for the smaller ones), at most 30 fps, H.264 with a silent stereo AAC track,
// 15 to 30 seconds long.
// `yarn compose-preview <recording> <language> [start] [duration] [speed]`: `speed` below 1 slows
// the recording down, to stretch a slide that was a little quick to Apple's 15 seconds.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PREVIEW = { width: 886, height: 1920, frameRate: 30 };
const DURATION_LIMITS_SECONDS = { min: 15, max: 30 };

const [recordingArgument, language, startArgument, durationArgument, speedArgument] =
  process.argv.slice(2);
if (!recordingArgument || !language) {
  console.error(
    "Usage: yarn compose-preview <recording> <language> [start seconds] [duration seconds] [speed]",
  );
  process.exit(1);
}
const recordingPath = path.resolve(recordingArgument);
if (!fs.existsSync(recordingPath)) {
  console.error(`No recording at ${recordingPath}`);
  process.exit(1);
}

const recordingSeconds = Number(
  execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    recordingPath,
  ]).toString(),
);
const startSeconds = Number(startArgument ?? 0);
const speed = Number(speedArgument ?? 1);
// The cut, in the recording's own seconds, and how long it plays once slowed down or sped up.
const cutSeconds = Number(durationArgument ?? recordingSeconds - startSeconds);
const durationSeconds = Math.min(DURATION_LIMITS_SECONDS.max, cutSeconds / speed);
if (durationSeconds < DURATION_LIMITS_SECONDS.min) {
  console.error(
    `${durationSeconds.toFixed(1)} s: Apple wants ${DURATION_LIMITS_SECONDS.min} to ${DURATION_LIMITS_SECONDS.max} seconds.`,
  );
  process.exit(1);
}

const outputDirectory = path.join(ROOT, "output", "appPreview", language);
fs.mkdirSync(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "preview.mp4");

// The simulator's 1320 × 2868 is a hair taller than 886 × 1920: scaled to cover, then cropped.
const videoFilter = [
  `setpts=PTS/${speed}`,
  `scale=${PREVIEW.width}:${PREVIEW.height}:force_original_aspect_ratio=increase`,
  `crop=${PREVIEW.width}:${PREVIEW.height}`,
  `fps=${PREVIEW.frameRate}`,
  "format=yuv420p",
].join(",");

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-ss", String(startSeconds),
    "-t", String(cutSeconds),
    "-i", recordingPath,
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-vf", videoFilter,
    "-c:v", "libx264",
    "-profile:v", "high",
    "-preset", "veryfast",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "256k",
    "-t", String(durationSeconds),
    "-movflags", "+faststart",
    outputPath,
  ],
  { stdio: "inherit" },
);
console.log(`${path.relative(ROOT, outputPath)}: ${durationSeconds.toFixed(1)} s`);
