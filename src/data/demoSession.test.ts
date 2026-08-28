import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { demoSession } from "./demoSession";
import type { MemoryImportance } from "../types/session";

const TIMESTAMP = /^\d{2}:\d{2}:\d{2}$/;

function toSeconds(timestamp: string): number {
  const [h, m, s] = timestamp.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

describe("demoSession", () => {
  it("모든 Memory Unit이 존재하는 페이지를 참조한다", () => {
    const pageNumbers = demoSession.pages.map((page) => page.pageNumber);
    for (const memory of demoSession.memories) {
      expect(pageNumbers).toContain(memory.pageNumber);
    }
  });

  it("페이지 이미지 파일이 public에 존재한다", () => {
    for (const page of demoSession.pages) {
      const filePath = resolve("public", page.imagePath.replace(/^\//, ""));
      expect(existsSync(filePath), `${page.imagePath} 없음`).toBe(true);
    }
  });

  it("id와 페이지 번호가 중복되지 않는다", () => {
    const ids = demoSession.memories.map((memory) => memory.id);
    const pageNumbers = demoSession.pages.map((page) => page.pageNumber);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(pageNumbers).size).toBe(pageNumbers.length);
  });

  it("시연에 필요한 핵심·시험·과제 Memory Unit을 포함한다", () => {
    const required: Array<[MemoryImportance, string, number]> = [
      ["key", "00:12:05", 10],
      ["exam", "00:18:32", 12],
      ["assignment", "00:23:10", 15],
    ];
    for (const [importance, timestamp, pageNumber] of required) {
      const found = demoSession.memories.filter(
        (memory) => memory.importance === importance,
      );
      expect(found).toHaveLength(1);
      expect(found[0].timestamp).toBe(timestamp);
      expect(found[0].pageNumber).toBe(pageNumber);
    }
  });

  it("타임스탬프 형식이 올바르고 시간순으로 정렬되어 있다", () => {
    expect(demoSession.duration).toMatch(TIMESTAMP);
    const seconds = demoSession.memories.map((memory) => {
      expect(memory.timestamp).toMatch(TIMESTAMP);
      return toSeconds(memory.timestamp);
    });
    expect(seconds).toEqual([...seconds].sort((a, b) => a - b));
    expect(seconds.at(-1)).toBeLessThan(toSeconds(demoSession.duration));
  });

  it("검색에 사용할 keywords와 본문이 비어 있지 않다", () => {
    for (const memory of demoSession.memories) {
      expect(memory.keywords.length).toBeGreaterThanOrEqual(3);
      expect(memory.transcript.trim()).not.toBe("");
      expect(memory.summary.trim()).not.toBe("");
    }
  });
});
