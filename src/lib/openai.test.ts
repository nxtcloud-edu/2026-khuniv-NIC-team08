import { afterEach, describe, expect, it, vi } from "vitest";
import { demoSession } from "../data/demoSession";
import {
  API_KEY_STORAGE_KEY,
  askGpt,
  parseGptAnswer,
  readStoredApiKey,
  resolveConfig,
  writeStoredApiKey,
} from "./openai";

const memories = demoSession.memories;

function gptResponse(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("resolveConfig", () => {
  it("키가 비어 있으면 null을 반환한다", () => {
    expect(resolveConfig("")).toBeNull();
    expect(resolveConfig("   ")).toBeNull();
  });

  it("키가 있으면 .env의 모델과 엔드포인트를 함께 준다", () => {
    expect(resolveConfig("  sk-test  ")).toEqual({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
    });
  });
});

describe("API 키 저장", () => {
  it("저장한 키를 다시 읽는다", () => {
    writeStoredApiKey("  sk-stored  ");
    expect(localStorage.getItem(API_KEY_STORAGE_KEY)).toBe("sk-stored");
    expect(readStoredApiKey()).toBe("sk-stored");
  });

  it("빈 값을 쓰면 저장된 키를 지운다", () => {
    writeStoredApiKey("sk-stored");
    writeStoredApiKey("");
    expect(readStoredApiKey()).toBe("");
  });
});

describe("parseGptAnswer", () => {
  it("답변과 근거 Memory Unit을 뽑아낸다", () => {
    const target = memories[1];
    const result = parseGptAnswer(
      JSON.stringify({ answer: "시험 범위입니다.", memoryId: target.id }),
      memories,
    );

    expect(result.answer).toBe("시험 범위입니다.");
    expect(result.memory).toBe(target);
  });

  it("존재하지 않는 id는 근거로 인정하지 않는다", () => {
    const result = parseGptAnswer(
      JSON.stringify({ answer: "답변", memoryId: "지어낸-id" }),
      memories,
    );

    expect(result.memory).toBeNull();
  });

  it("근거가 없으면 memory는 null이다", () => {
    const result = parseGptAnswer(
      JSON.stringify({ answer: "근거가 없습니다.", memoryId: null }),
      memories,
    );

    expect(result.memory).toBeNull();
  });

  it("JSON이 아니거나 답변이 비면 오류를 던진다", () => {
    expect(() => parseGptAnswer("not json", memories)).toThrow(/JSON/);
    expect(() => parseGptAnswer(JSON.stringify({ answer: "  " }), memories)).toThrow(/비어/);
  });
});

describe("askGpt", () => {
  const config = { apiKey: "sk-test", model: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1" };

  it("모델과 Memory Unit 목록을 담아 요청한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(gptResponse(JSON.stringify({ answer: "답변", memoryId: memories[0].id })));

    const result = await askGpt("시험 범위가 뭐야?", memories, config);

    expect(result.memory).toBe(memories[0]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");

    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[1].content).toContain(memories[0].id);
    expect(body.messages[1].content).toContain("시험 범위가 뭐야?");
  });

  it("HTTP 오류는 상태 코드를 담아 던진다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    } as Response);

    await expect(askGpt("질문", memories, config)).rejects.toThrow(/401/);
  });
});
