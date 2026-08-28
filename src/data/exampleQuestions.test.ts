import { describe, expect, it } from "vitest";

import { exampleSession } from "./exampleSession";
import { searchMemory } from "../lib/search";

/**
 * 시연에서 던질 질문들이 로컬 검색만으로도 주제가 맞는 근거를 찾는지 지킨다.
 * (OpenAI 키가 없거나 호출이 실패했을 때의 경로. 키가 있으면 GPT가 답한다.)
 *
 * fixture를 다시 만들어도 깨지지 않도록 페이지 번호가 아니라 주제어로 확인한다.
 */
const DEMO_QUESTIONS: [question: string, topic: RegExp][] = [
  ["정규화가 뭐야?", /정규화|오버피팅/],
  ["오버피팅이 뭐야?", /오버피팅|언더피팅/],
  ["퀴즈는 언제 나왔어?", /퀴즈/],
  ["러닝 레이트는 어떻게 정해?", /러닝 레이트|학습률/],
  ["소프트맥스가 뭐야?", /소프트맥스|softmax/i],
  ["손실 함수가 뭐야?", /로스|손실|loss/i],
];

describe("시연 질문", () => {
  it.each(DEMO_QUESTIONS)("%s → 주제가 맞는 근거를 찾는다", (question, topic) => {
    const result = searchMemory(question, exampleSession.memories);

    expect(result).not.toBeNull();
    const memory = result!.memory;
    const haystack = `${memory.summary} ${memory.keywords.join(" ")} ${memory.transcript}`;
    expect(haystack).toMatch(topic);
  });

  it("근거가 된 발언은 실제 페이지를 가리킨다", () => {
    const pageNumbers = new Set(exampleSession.pages.map((page) => page.pageNumber));
    for (const memory of exampleSession.memories) {
      expect(pageNumbers.has(memory.pageNumber)).toBe(true);
    }
  });

  it("강의와 무관한 질문에는 근거를 만들지 않는다", () => {
    expect(searchMemory("오늘 점심 메뉴가 뭐야?", exampleSession.memories)).toBeNull();
  });
});
