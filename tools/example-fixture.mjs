import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  clockToSeconds,
  extractJpegPages,
  isMp4File,
  parseTranscript,
} from "./example-fixture-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const manifestPath = join(dataDir, "session.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function fail(message) {
  throw new Error(message);
}

function sourcePath(name) {
  return join(dataDir, manifest.source[name]);
}

function fixturePath(webPath) {
  return join(root, "public", webPath.replace(/^\/+/, ""));
}

function validateFixture() {
  const pdfPath = sourcePath("pdf");
  const transcriptPath = sourcePath("transcript");
  if (!existsSync(pdfPath)) fail(`Missing data PDF: ${pdfPath}`);
  if (!existsSync(transcriptPath)) fail(`Missing data transcript: ${transcriptPath}`);

  const pdfPages = extractJpegPages(pdfPath);
  if (pdfPages.length !== manifest.expectedPdfPages) {
    fail(`Expected ${manifest.expectedPdfPages} PDF pages, found ${pdfPages.length}`);
  }

  const cues = parseTranscript(readFileSync(transcriptPath, "utf8"), manifest.recordingStartedAt);
  if (cues.length !== manifest.expectedTranscriptCues) {
    fail(`Expected ${manifest.expectedTranscriptCues} transcript cues, found ${cues.length}`);
  }

  const pageByNumber = new Map(pdfPages.map((page) => [page.pageNumber, page]));
  for (const page of manifest.pages) {
    const pdfPage = pageByNumber.get(page.pageNumber);
    if (!pdfPage) fail(`Manifest references missing PDF page ${page.pageNumber}`);
    const imagePath = fixturePath(page.imagePath);
    if (!existsSync(imagePath)) fail(`Missing generated page image: ${imagePath}`);
    if (!readFileSync(imagePath).equals(pdfPage.jpeg)) {
      fail(`Generated page image does not match PDF page ${page.pageNumber}`);
    }
  }

  const duration = clockToSeconds(manifest.duration);
  for (const memory of manifest.memories) {
    const timestamp = clockToSeconds(memory.timestamp);
    if (timestamp > duration) fail(`Memory ${memory.id} is outside the video duration`);
    if (!pageByNumber.has(memory.pageNumber)) fail(`Memory ${memory.id} has an invalid page`);

    const expectedStart = clockToSeconds(memory.sourceStart) - clockToSeconds(manifest.recordingStartedAt);
    const expectedEnd = clockToSeconds(memory.sourceEnd) - clockToSeconds(manifest.recordingStartedAt);
    if (timestamp < expectedStart || timestamp > expectedEnd) {
      fail(`Memory ${memory.id} timestamp is outside its transcript cue`);
    }
    const cue = cues.find((item) => item.start === expectedStart && item.end === expectedEnd);
    if (!cue || cue.text !== memory.transcript) {
      fail(`Memory ${memory.id} does not match the source transcript`);
    }
  }

  const videoPath = fixturePath(manifest.fixture.videoPath);
  if (!existsSync(videoPath) || !isMp4File(videoPath)) {
    fail(`Missing or invalid generated video: ${videoPath}`);
  }

  return {
    pdfPages: pdfPages.length,
    transcriptCues: cues.length,
    memories: manifest.memories.length,
    videoPath,
  };
}

function prepareFixture({ skipVideo }) {
  const pdfPages = extractJpegPages(sourcePath("pdf"));
  const pageByNumber = new Map(pdfPages.map((page) => [page.pageNumber, page]));

  for (const page of manifest.pages) {
    const outputPath = fixturePath(page.imagePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, pageByNumber.get(page.pageNumber).jpeg);
  }

  if (!skipVideo) {
    const inputVideo = sourcePath("video");
    if (!existsSync(inputVideo) || !isMp4File(inputVideo)) {
      fail(`Missing or invalid source video: ${inputVideo}`);
    }

    const outputVideo = fixturePath(manifest.fixture.videoPath);
    const temporaryVideo = `${outputVideo}.tmp.mp4`;
    mkdirSync(dirname(outputVideo), { recursive: true });
    rmSync(temporaryVideo, { force: true });

    const ffmpeg = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-y",
        "-i",
        inputVideo,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-vf",
        manifest.fixture.videoFilter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "26",
        "-tune",
        "stillimage",
        "-c:a",
        "aac",
        "-ac",
        "1",
        "-b:a",
        "48k",
        "-movflags",
        "+faststart",
        temporaryVideo,
      ],
      { stdio: "inherit" },
    );
    if (ffmpeg.error?.code === "ENOENT") fail("ffmpeg is required for example:prepare");
    if (ffmpeg.status !== 0) fail(`ffmpeg exited with status ${ffmpeg.status}`);
    renameSync(temporaryVideo, outputVideo);
  }

  return validateFixture();
}

const command = process.argv[2] ?? "check";
const skipVideo = process.argv.includes("--skip-video");
if (command !== "check" && command !== "prepare") {
  fail(`Unknown command: ${command}`);
}
const result = command === "prepare" ? prepareFixture({ skipVideo }) : validateFixture();
console.log(
  `Example fixture OK: ${result.pdfPages} PDF pages, ${result.transcriptCues} transcript cues, ${result.memories} memories`,
);
