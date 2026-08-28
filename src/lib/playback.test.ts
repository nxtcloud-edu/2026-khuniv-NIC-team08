import { describe, expect, it } from "vitest";

import { memoryAtSecond, segmentAtSecond, timestampToSeconds } from "./playback";
import type { MemoryUnit, SlideSegment } from "../types/session";

const segments: SlideSegment[] = [
  { index: 0, pageNumber: 1, start: 0, end: 10, thumbnailPath: "/a.jpg", confidence: 0.99 },
  { index: 1, pageNumber: 2, start: 11, end: 28, thumbnailPath: "/b.jpg", confidence: 0.99 },
  // 11초 비어 있는 구간 (매칭되지 않은 화면)
  { index: 2, pageNumber: 5, start: 40, end: 90, thumbnailPath: "/c.jpg", confidence: 0.98 },
];

function memory(id: string, timestamp: string): MemoryUnit {
  return {
    id,
    timestamp,
    pageNumber: 1,
    transcript: "",
    summary: "",
    importance: "normal",
    keywords: [],
  };
}

const memories = [memory("m1", "00:00:05"), memory("m2", "00:00:20"), memory("m3", "00:01:10")];

describe("timestampToSeconds", () => {
  it("HH:MM:SS를 초로 바꾼다", () => {
    expect(timestampToSeconds("00:00:40")).toBe(40);
    expect(timestampToSeconds("00:52:52")).toBe(3172);
    expect(timestampToSeconds("01:00:00")).toBe(3600);
  });
});

describe("segmentAtSecond", () => {
  it("구간 안의 시각이면 그 구간을 돌려준다", () => {
    expect(segmentAtSecond(segments, 0)?.pageNumber).toBe(1);
    expect(segmentAtSecond(segments, 10)?.pageNumber).toBe(1);
    expect(segmentAtSecond(segments, 11)?.pageNumber).toBe(2);
    expect(segmentAtSecond(segments, 65)?.pageNumber).toBe(5);
  });

  it("구간 사이의 빈틈과 범위 밖은 undefined", () => {
    expect(segmentAtSecond(segments, 33)).toBeUndefined();
    expect(segmentAtSecond(segments, 200)).toBeUndefined();
  });

  it("구간이 없으면 undefined", () => {
    expect(segmentAtSecond([], 5)).toBeUndefined();
  });
});

describe("memoryAtSecond", () => {
  it("재생 위치보다 앞선 마지막 발언을 돌려준다", () => {
    expect(memoryAtSecond(memories, 5)?.id).toBe("m1");
    expect(memoryAtSecond(memories, 19)?.id).toBe("m1");
    expect(memoryAtSecond(memories, 20)?.id).toBe("m2");
    expect(memoryAtSecond(memories, 9999)?.id).toBe("m3");
  });

  it("첫 발언보다 앞이면 undefined", () => {
    expect(memoryAtSecond(memories, 0)).toBeUndefined();
  });
});
