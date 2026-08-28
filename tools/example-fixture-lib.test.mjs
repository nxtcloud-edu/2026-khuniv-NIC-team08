import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  clockToSeconds,
  extractJpegPages,
  isMp4File,
  parseTranscript,
  secondsToTimestamp,
} from "./example-fixture-lib.mjs";

const pdfPath = "example/MLbasics_문상혁.pdf";
const transcriptPath = "example/DAVIAN Basic Study 2026-07-08 14_00(GMT+9_00).txt";

describe("example fixture helpers", () => {
  it("시간 형식을 초 단위로 왕복 변환한다", () => {
    expect(clockToSeconds("00:08:55")).toBe(535);
    expect(secondsToTimestamp(535)).toBe("00:08:55");
  });

  it("벽시계 전사를 영상 상대 시간으로 변환한다", () => {
    const cues = parseTranscript(readFileSync(transcriptPath, "utf8"), "14:01:25");
    expect(cues).toHaveLength(495);
    expect(cues.find((cue) => cue.start === 533)?.text).toContain("로그를 씌움으로써");
  });

  it("이미지 기반 PDF에서 68개 JPEG 페이지를 추출한다", () => {
    const pages = extractJpegPages(pdfPath);
    expect(pages).toHaveLength(68);
    expect(pages[2]).toMatchObject({ pageNumber: 3, width: 1920, height: 1080 });
    expect(pages[2].jpeg.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });

  it("생성된 강의 fixture가 MP4 형식이다", () => {
    expect(isMp4File("public/example/lecture.mp4")).toBe(true);
  });
});
