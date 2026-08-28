import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { exampleSession } from "./exampleSession";

describe("exampleSession", () => {
  it("실제 PDF에서 추출한 페이지와 로컬 영상을 참조한다", () => {
    expect(exampleSession.videoPath).toBe("/example/lecture.mp4");
    expect(existsSync(resolve("public", exampleSession.videoPath!.slice(1)))).toBe(true);

    for (const page of exampleSession.pages) {
      expect(existsSync(resolve("public", page.imagePath.slice(1)))).toBe(true);
    }
  });

  it("모든 발언이 실제 PDF 페이지를 참조하고 시간순으로 정렬되어 있다", () => {
    const pages = new Set(exampleSession.pages.map((page) => page.pageNumber));
    const timestamps = exampleSession.memories.map((memory) => memory.timestamp);

    for (const memory of exampleSession.memories) {
      expect(pages.has(memory.pageNumber)).toBe(true);
      expect(memory.transcript.trim()).not.toBe("");
    }
    expect(timestamps).toEqual([...timestamps].sort());
  });
});
