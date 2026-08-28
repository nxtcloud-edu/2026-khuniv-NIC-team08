import { describe, expect, it } from "vitest";

import {
  assignCues,
  buildSegments,
  correlation,
  longestCue,
  matchFrames,
  signature,
  signatures,
} from "./session-build-lib.mjs";

/** 밝기만 다르고 무늬가 같은 두 장 */
const dark = Uint8Array.from([10, 20, 30, 40]);
const bright = Uint8Array.from([110, 120, 130, 140]);
const inverted = Uint8Array.from([40, 30, 20, 10]);

describe("signature", () => {
  it("평균 0, 크기 1로 맞춘다", () => {
    const vector = signature(dark, 0, 4);
    const mean = vector.reduce((total, value) => total + value, 0);
    const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0));

    expect(mean).toBeCloseTo(0);
    expect(norm).toBeCloseTo(1);
  });

  it("밝기가 달라도 같은 무늬면 상관도가 1이다", () => {
    expect(correlation(signature(dark, 0, 4), signature(bright, 0, 4))).toBeCloseTo(1);
  });

  it("무늬가 뒤집히면 상관도가 -1이다", () => {
    expect(correlation(signature(dark, 0, 4), signature(inverted, 0, 4))).toBeCloseTo(-1);
  });
});

describe("signatures", () => {
  it("이어붙인 raw 버퍼를 장수만큼 쪼갠다", () => {
    expect(signatures(Uint8Array.from([...dark, ...bright]), 4)).toHaveLength(2);
  });

  it("길이가 맞지 않으면 실패한다", () => {
    expect(() => signatures(Uint8Array.from([1, 2, 3]), 4)).toThrow(/multiple of 4/);
  });
});

describe("matchFrames", () => {
  const pages = [signature(dark, 0, 4), signature(inverted, 0, 4)];

  it("가장 닮은 페이지와 차순위와의 격차를 함께 돌려준다", () => {
    const [match] = matchFrames([signature(bright, 0, 4)], pages, 0.5);
    expect(match.pageNumber).toBe(1);
    expect(match.score).toBeCloseTo(1);
    expect(match.margin).toBeCloseTo(2);
  });

  it("상관도가 기준 미만이면 페이지 없음으로 둔다", () => {
    const [match] = matchFrames([signature(inverted, 0, 4)], [signature(dark, 0, 4)], 0.5);
    expect(match).toBeNull();
  });
});

describe("buildSegments", () => {
  const scored = (pageNumber) => ({ pageNumber, score: 0.99, margin: 0.3 });

  it("같은 페이지가 이어지는 구간으로 묶는다", () => {
    const segments = buildSegments(
      [scored(1), scored(1), scored(1), scored(2), scored(2), scored(2)],
      { secondsPerFrame: 1, minRunSeconds: 3 },
    );

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ pageNumber: 1, start: 0, end: 2 });
    expect(segments[1]).toMatchObject({ pageNumber: 2, start: 3, end: 5 });
  });

  it("짧은 조각은 전환 흔들림으로 보고 앞 구간에 흡수한다", () => {
    const segments = buildSegments(
      [scored(1), scored(1), scored(1), scored(9), scored(2), scored(2), scored(2)],
      { secondsPerFrame: 1, minRunSeconds: 3 },
    );

    expect(segments.map((segment) => segment.pageNumber)).toEqual([1, 2]);
    expect(segments[0].end).toBe(3);
  });

  it("페이지를 찾지 못한 프레임은 구간에서 뺀다", () => {
    const segments = buildSegments([null, null, scored(1), scored(1), scored(1)], {
      secondsPerFrame: 1,
      minRunSeconds: 1,
    });

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ pageNumber: 1, start: 2, end: 4 });
  });
});

describe("assignCues", () => {
  const segments = [
    { pageNumber: 1, start: 0, end: 10 },
    { pageNumber: 2, start: 11, end: 20 },
  ];
  const cues = [
    { start: 2, end: 6, text: "첫 발언" },
    { start: 9, end: 13, text: "구간 경계를 걸친 발언" },
    { start: 15, end: 18, text: "둘째 발언" },
  ];

  it("발언은 시작 시각이 속한 구간에 붙는다", () => {
    const [first, second] = assignCues(segments, cues);
    expect(first.cues.map((cue) => cue.text)).toEqual(["첫 발언", "구간 경계를 걸친 발언"]);
    expect(second.cues.map((cue) => cue.text)).toEqual(["둘째 발언"]);
  });
});

describe("longestCue", () => {
  it("내용이 가장 많은 발언을 고른다", () => {
    expect(longestCue([{ text: "짧다" }, { text: "이쪽이 훨씬 더 길다" }]).text).toBe(
      "이쪽이 훨씬 더 길다",
    );
  });

  it("발언이 없으면 null", () => {
    expect(longestCue([])).toBeNull();
  });
});
