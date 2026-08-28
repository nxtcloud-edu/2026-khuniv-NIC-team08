import { describe, expect, it } from "vitest";
import { demoSession } from "../data/demoSession";
import {
  buildAnswer,
  extractQueryTerms,
  formatTimestamp,
  normalizeText,
  searchMemory,
} from "./search";
import type { MemoryUnit } from "../types/session";

const memories = demoSession.memories;

function findMemory(id: string): MemoryUnit {
  const memory = memories.find((item) => item.id === id);
  if (!memory) throw new Error(`데모 데이터에 ${id} 가 없다`);
  return memory;
}

describe("normalizeText", () => {
  it("공백과 문장부호, 대소문자 차이를 제거한다", () => {
    expect(normalizeText("시험에 나온다고 한 부분이 뭐야?")).toBe(
      "시험에나온다고한부분이뭐야",
    );
    expect(normalizeText("  Exam,  범위!  ")).toBe("exam범위");
  });
});

describe("formatTimestamp", () => {
  it("시가 0이면 분·초만 남긴다", () => {
    expect(formatTimestamp("00:18:32")).toBe("18:32");
    expect(formatTimestamp("01:05:00")).toBe("01:05:00");
  });
});

describe("extractQueryTerms", () => {
  it("질문에 등장한 어휘만 남긴다", () => {
    const terms = extractQueryTerms("과제는 언제까지야?", memories);
    expect(terms).toContain("과제");
    expect(terms).toContain("언제까지");
    expect(terms).not.toContain("시험");
  });

  it("관련 없는 질문에서는 어휘를 찾지 못한다", () => {
    expect(extractQueryTerms("오늘 점심 뭐 먹지?", memories)).toEqual([]);
  });
});

describe("searchMemory - 발표용 질문", () => {
  it("“시험에 나온다고 한 부분이 뭐야?”는 시험 Memory Unit을 반환한다", () => {
    const result = searchMemory("시험에 나온다고 한 부분이 뭐야?", memories);
    expect(result?.memory.importance).toBe("exam");
    expect(result?.memory.timestamp).toBe("00:18:32");
    expect(result?.memory.pageNumber).toBe(12);
  });

  it("“과제는 언제까지야?”는 과제 Memory Unit을 반환한다", () => {
    const result = searchMemory("과제는 언제까지야?", memories);
    expect(result?.memory.importance).toBe("assignment");
    expect(result?.memory.timestamp).toBe("00:23:10");
    expect(result?.memory.pageNumber).toBe(15);
  });

  it("“핵심 개념이 뭐야?”는 핵심 개념 Memory Unit을 반환한다", () => {
    const result = searchMemory("핵심 개념이 뭐야?", memories);
    expect(result?.memory.importance).toBe("key");
    expect(result?.memory.timestamp).toBe("00:12:05");
    expect(result?.memory.pageNumber).toBe(10);
  });

  it("관련 없는 질문에는 null을 반환한다", () => {
    expect(searchMemory("오늘 점심 뭐 먹지?", memories)).toBeNull();
    expect(searchMemory("", memories)).toBeNull();
    expect(searchMemory("   ?!  ", memories)).toBeNull();
  });
});

describe("searchMemory - 규칙", () => {
  it("동의어로 물어도 같은 Memory Unit을 찾는다", () => {
    expect(searchMemory("출제 범위 알려줘", memories)?.memory.importance).toBe(
      "exam",
    );
    expect(searchMemory("제출 마감이 언제야?", memories)?.memory.importance).toBe(
      "assignment",
    );
    expect(searchMemory("요점만 정리해줘", memories)?.memory.importance).toBe(
      "key",
    );
  });

  it("의도 배지가 없는 발언도 어휘가 맞으면 찾는다", () => {
    const result = searchMemory("지난 시간에 복습한 내용이 뭐야?", memories);
    expect(result?.memory.importance).toBe("normal");
    expect(result?.memory.timestamp).toBe("00:08:15");
  });

  it("같은 질문은 항상 같은 Memory Unit과 점수를 반환한다", () => {
    const question = "시험에 나온다고 한 부분이 뭐야?";
    const first = searchMemory(question, memories);
    const second = searchMemory(question, memories);
    expect(first?.memory.id).toBe(second?.memory.id);
    expect(first?.score).toBe(second?.score);
  });

  it("의도가 일치하는 Memory Unit이 더 높은 점수를 받는다", () => {
    const exam = findMemory("memory-003");
    const withIntent = searchMemory("시험 범위가 어디야?", memories);
    expect(withIntent?.memory.id).toBe(exam.id);
    expect(withIntent?.score).toBeGreaterThan(0);
  });
});

describe("buildAnswer", () => {
  it("시각과 페이지, 요약을 포함한 답변을 만든다", () => {
    const exam = findMemory("memory-003");
    const answer = buildAnswer(exam);
    expect(answer).toContain("18:32");
    expect(answer).toContain("PDF 12페이지");
    expect(answer).toContain(exam.summary);
  });

  it("중요도에 따라 다른 문장으로 시작한다", () => {
    expect(buildAnswer(findMemory("memory-003"))).toMatch(/^시험에서/);
    expect(buildAnswer(findMemory("memory-004"))).toMatch(/^과제와/);
    expect(buildAnswer(findMemory("memory-002"))).toMatch(/^강의의 핵심 개념/);
    expect(buildAnswer(findMemory("memory-001"))).toMatch(/^관련된 발언/);
  });
});
