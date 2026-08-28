/**
 * example/의 원본(영상·PDF·전사)에서 session.json을 실제로 생성한다.
 *
 *   영상 프레임 -+
 *   PDF 페이지 --+- 이미지 매칭 -> 슬라이드 구간 -+- 전사 결합 -> LLM 요약 -> Memory Unit
 *                                                +- 대표 프레임 썸네일
 *
 * manifest(example/session.json)의 source/fixture/recordingStartedAt은 입력으로 두고,
 * pages·segments·memories·pipeline만 다시 계산해 덮어쓴다.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libUrl = (name) => pathToFileURL(join(root, "tools", name)).href;
const { clockToSeconds, extractJpegPages, parseTranscript, secondsToTimestamp } = await import(
  libUrl("example-fixture-lib.mjs")
);
const { assignCues, buildSegments, longestCue, matchFrames, signatures } = await import(
  libUrl("session-build-lib.mjs")
);
const { annotate } = await import(libUrl("session-annotate.mjs"));

// 서명 해상도. 32x32면 68장의 비슷한 슬라이드도 충분히 갈라진다.
const GRID = 32;
const SIGNATURE_LENGTH = GRID * GRID;
const SECONDS_PER_FRAME = 1;
const MIN_CORRELATION = 0.5; // 이 밑은 종료 화면 등 슬라이드가 아닌 장면
const MIN_RUN_SECONDS = 3; // 이보다 짧은 조각은 전환 흔들림으로 보고 흡수
const THUMBNAIL_OFFSET_SECONDS = 2; // 구간 시작 직후 (전환 잔상 회피)
const LLM_BATCH_SIZE = 10;

const manifestPath = join(root, "example", "session.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const exampleDir = join(root, "example");
const pagesDir = join(root, "public", "example", "pages");
const framesDir = join(root, "public", "example", "frames");
const thumbsDir = join(root, "public", "example", "thumbs");
const workDir = join(root, "node_modules", ".cache", "anythingnote");

const skipLlm = process.argv.includes("--skip-llm");

function fail(message) {
  console.error(`\n  build-session 실패: ${message}\n`);
  process.exit(1);
}

function ffmpeg(args) {
  const result = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "pipe", "inherit"] });
  if (result.error?.code === "ENOENT") fail("ffmpeg이 필요합니다 (PATH에서 찾지 못했습니다)");
  if (result.status !== 0) fail(`ffmpeg 종료 코드 ${result.status}`);
}

function clearJpegs(directory) {
  mkdirSync(directory, { recursive: true });
  for (const file of readdirSync(directory)) {
    if (file.endsWith(".jpg")) rmSync(join(directory, file));
  }
}

/** .env를 직접 읽는다 (Node 스크립트라 Vite의 import.meta.env를 쓸 수 없다) */
function readEnv() {
  const envPath = join(root, ".env");
  const values = { ...process.env };
  if (!existsSync(envPath)) return values;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

const step = (index, label) => console.log(`[${index}/6] ${label}`);

// -- 1. PDF 페이지 ------------------------------------------------------------
step(1, "PDF 페이지 추출");
const pdfPages = extractJpegPages(join(exampleDir, manifest.source.pdf));
if (pdfPages.length !== manifest.expectedPdfPages) {
  fail(`PDF 페이지 ${manifest.expectedPdfPages}장을 기대했지만 ${pdfPages.length}장을 찾았습니다`);
}
clearJpegs(pagesDir);
const pageFileName = (pageNumber) => `page-${String(pageNumber).padStart(3, "0")}.jpg`;
for (const page of pdfPages) {
  writeFileSync(join(pagesDir, pageFileName(page.pageNumber)), page.jpeg);
}
clearJpegs(thumbsDir);
ffmpeg([
  "-start_number", "1",
  "-i", join(pagesDir, "page-%03d.jpg"),
  "-vf", "scale=256:144",
  "-q:v", "5",
  join(thumbsDir, "page-%03d.jpg"),
]);
console.log(`      ${pdfPages.length}장 (${pdfPages[0].width}x${pdfPages[0].height}) + 썸네일`);

// -- 2. 서명 계산 -------------------------------------------------------------
step(2, "영상 프레임과 PDF 페이지를 흑백 축소본으로 변환");
mkdirSync(workDir, { recursive: true });
const pageSignaturePath = join(workDir, "pages.gray");
const frameSignaturePath = join(workDir, "frames.gray");
const videoPath = join(root, "public", manifest.fixture.videoPath.replace(/^\/+/, ""));
if (!existsSync(videoPath)) fail(`공개용 영상이 없습니다: ${videoPath} (npm run example:prepare 필요)`);

ffmpeg([
  "-start_number", "1",
  "-i", join(pagesDir, "page-%03d.jpg"),
  "-vf", `scale=${GRID}:${GRID},format=gray`,
  "-f", "rawvideo", "-pix_fmt", "gray", pageSignaturePath,
]);
ffmpeg([
  "-i", videoPath,
  "-vf", `fps=${1 / SECONDS_PER_FRAME},scale=${GRID}:${GRID},format=gray`,
  "-f", "rawvideo", "-pix_fmt", "gray", frameSignaturePath,
]);

const pageSignatures = signatures(readFileSync(pageSignaturePath), SIGNATURE_LENGTH);
const frameSignatures = signatures(readFileSync(frameSignaturePath), SIGNATURE_LENGTH);
console.log(`      프레임 ${frameSignatures.length}장 / 페이지 ${pageSignatures.length}장`);

// -- 3. 화면 매칭 -------------------------------------------------------------
step(3, "화면 변화 감지와 PDF 페이지 매칭");
const matches = matchFrames(frameSignatures, pageSignatures, MIN_CORRELATION);
const segments = buildSegments(matches, {
  secondsPerFrame: SECONDS_PER_FRAME,
  minRunSeconds: MIN_RUN_SECONDS,
});
const matchedPages = new Set(segments.map((segment) => segment.pageNumber));
console.log(`      슬라이드 구간 ${segments.length}개 · 등장 페이지 ${matchedPages.size}/${pdfPages.length}`);

// -- 4. 대표 프레임 썸네일 ----------------------------------------------------
step(4, "구간별 대표 프레임 추출");
clearJpegs(framesDir);
segments.forEach((segment, index) => {
  const at = Math.min(segment.start + THUMBNAIL_OFFSET_SECONDS, segment.end);
  const name = `seg-${String(index + 1).padStart(3, "0")}.jpg`;
  ffmpeg([
    "-ss", String(at),
    "-i", videoPath,
    "-frames:v", "1",
    "-vf", "scale=256:144",
    "-q:v", "5",
    join(framesDir, name),
  ]);
  segment.thumbnailPath = `/example/frames/${name}`;
});
console.log(`      썸네일 ${segments.length}장`);

// -- 5. 전사 결합 -------------------------------------------------------------
step(5, "전사를 슬라이드 구간에 배정");
const cues = parseTranscript(
  readFileSync(join(exampleDir, manifest.source.transcript), "utf8"),
  manifest.recordingStartedAt,
);
if (cues.length !== manifest.expectedTranscriptCues) {
  fail(`전사 ${manifest.expectedTranscriptCues}구간을 기대했지만 ${cues.length}구간을 찾았습니다`);
}
const joined = assignCues(segments, cues);
const spoken = joined.filter((segment) => segment.cues.length > 0);
const assignedCues = joined.reduce((total, segment) => total + segment.cues.length, 0);
console.log(`      발언 ${assignedCues}/${cues.length}개 배정 · 발언 있는 구간 ${spoken.length}개`);

// -- 6. Memory Unit 생성 ------------------------------------------------------
step(6, skipLlm ? "Memory Unit 생성 (규칙 기반)" : "Memory Unit 생성 (LLM)");
const { items: annotations, source: annotatedBy } = await annotate(spoken, {
  skipLlm,
  batchSize: LLM_BATCH_SIZE,
  env: readEnv(),
  cachePath: join(exampleDir, ".llm-cache.json"),
  onProgress: (done, total) => process.stdout.write(`\r      ${done}/${total} 구간 요약`),
});
process.stdout.write("\n");

const recordingStart = clockToSeconds(manifest.recordingStartedAt);
const slideIndexOf = new Map(joined.map((segment, index) => [segment, index]));
const memories = spoken.map((segment, index) => {
  const annotation = annotations[index];
  const anchor = segment.cues[annotation.anchorIndex] ?? longestCue(segment.cues);
  return {
    id: `ml-${String(index + 1).padStart(3, "0")}-p${String(segment.pageNumber).padStart(3, "0")}`,
    timestamp: secondsToTimestamp(anchor.start),
    sourceStart: secondsToTimestamp(anchor.start + recordingStart),
    sourceEnd: secondsToTimestamp(anchor.end + recordingStart),
    pageNumber: segment.pageNumber,
    slideIndex: slideIndexOf.get(segment),
    transcript: anchor.text,
    summary: annotation.summary,
    importance: annotation.importance,
    keywords: annotation.keywords,
  };
});

// 페이지 제목은 그 페이지가 떠 있던 동안의 발언에서 뽑은 주제를 쓴다.
const titleByPage = new Map();
spoken.forEach((segment, index) => {
  const existing = titleByPage.get(segment.pageNumber);
  if (!existing || existing.cues < segment.cues.length) {
    titleByPage.set(segment.pageNumber, { title: annotations[index].title, cues: segment.cues.length });
  }
});

const pages = pdfPages.map((page) => ({
  pageNumber: page.pageNumber,
  imagePath: `/example/pages/${pageFileName(page.pageNumber)}`,
  thumbnailPath: `/example/thumbs/${pageFileName(page.pageNumber)}`,
  title: titleByPage.get(page.pageNumber)?.title ?? `${page.pageNumber}페이지`,
}));

// -- 출력 ---------------------------------------------------------------------
const next = {
  ...manifest,
  pipeline: {
    sampledFrames: frameSignatures.length,
    sampleIntervalSeconds: SECONDS_PER_FRAME,
    signatureGrid: GRID,
    transcriptCues: cues.length,
    assignedCues,
    slideSegments: segments.length,
    pdfPages: pdfPages.length,
    matchedPages: matchedPages.size,
    memoryUnits: memories.length,
    annotatedBy,
  },
  segments: joined.map((segment, index) => ({
    index,
    pageNumber: segment.pageNumber,
    start: segment.start,
    end: segment.end,
    thumbnailPath: segment.thumbnailPath,
    confidence: Number(segment.confidence.toFixed(4)),
  })),
  pages,
  memories,
};

const temporaryPath = `${manifestPath}.tmp`;
writeFileSync(temporaryPath, `${JSON.stringify(next, null, 2)}\n`);
renameSync(temporaryPath, manifestPath);
console.log(`\n생성 완료 — 페이지 ${pages.length}장 · 슬라이드 구간 ${segments.length}개 · Memory Unit ${memories.length}개`);
