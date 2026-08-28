/**
 * 브라우저에서 OpenAI Chat Completions를 직접 호출하는 얇은 클라이언트.
 *
 * 답변은 항상 전달된 Memory Unit 안에서만 만들도록 제한하고, 모델이 고른 근거 id를
 * 실제 Memory Unit과 대조해 지어낸 id는 버린다. (근거 없는 답변을 만들지 않기 위함)
 */

import type { MemoryUnit } from "../types/session";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export const API_KEY_STORAGE_KEY = "anythingnote.openai.apiKey";

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface GptAnswer {
  answer: string;
  /** 모델이 근거로 고른 Memory Unit. 근거가 없으면 null */
  memory: MemoryUnit | null;
}

/** .env의 기본 키 (VITE_ 값은 번들에 포함되므로 로컬 개발용) */
export function envApiKey(): string {
  return import.meta.env.VITE_OPENAI_API_KEY?.trim() ?? "";
}

export function envModel(): string {
  return import.meta.env.VITE_OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function envBaseUrl(): string {
  return (import.meta.env.VITE_OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

// 시크릿 모드 등에서 localStorage 접근 자체가 throw 할 수 있다.
export function readStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredApiKey(apiKey: string): void {
  try {
    if (apiKey.trim()) localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    else localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    // 저장 실패해도 이번 세션 동안은 메모리 상태로 동작한다
  }
}

/** 키가 없으면 null — 호출부는 이때 로컬 키워드 검색으로 돌아간다. */
export function resolveConfig(apiKey: string): OpenAIConfig | null {
  const key = apiKey.trim();
  if (!key) return null;
  return { apiKey: key, model: envModel(), baseUrl: envBaseUrl() };
}

const SYSTEM_PROMPT = `너는 강의 녹화에서 만들어진 Memory Unit(발언 시각 + PDF 페이지 + 발언 원문 + 요약)을 근거로 답하는 한국어 노트 도우미다.

규칙:
- 주어진 Memory Unit을 주된 근거로 삼아, 사용자가 일반적인 GPT 답변에서 기대하는 수준으로 충분하고 친절하게 설명한다.
- 단순히 발언을 요약하지 말고 개념의 정의, 작동 방식, 중요한 이유와 이해를 돕는 예시를 질문에 맞게 포함한다.
- 강의에서 직접 확인되지 않는 내용을 사실처럼 단정하지 않는다. 일반적인 배경 설명을 덧붙일 때는 강의 내용과 자연스럽게 구분한다.
- 답변에 근거가 된 발언 시각과 PDF 페이지 번호를 자연스럽게 포함한다.
- 관련 Memory Unit이 없으면 추측하지 말고 근거가 없다고 답한다.
- 답변은 보통 2~4개 문단의 자연스러운 한국어로 작성한다. 질문이 단순하면 불필요하게 늘이지 않는다.

반드시 아래 형태의 JSON 객체 하나만 출력한다.
{"answer": "한국어 답변", "memoryId": "근거 Memory Unit의 id 또는 null"}`;

function buildContext(memories: MemoryUnit[]): string {
  return memories
    .map(
      (memory) =>
        `- id: ${memory.id}\n  시각: ${memory.timestamp}\n  PDF: ${memory.pageNumber}페이지\n  발언: ${memory.transcript}\n  요약: ${memory.summary}`,
    )
    .join("\n");
}

/** 모델 응답(JSON 문자열)을 실제 Memory Unit과 대조해 GptAnswer로 만든다. */
export function parseGptAnswer(content: string, memories: MemoryUnit[]): GptAnswer {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI 응답이 JSON 형식이 아닙니다.");
  }

  const payload = parsed as { answer?: unknown; memoryId?: unknown };
  const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
  if (!answer) throw new Error("OpenAI 답변이 비어 있습니다.");

  const memory = memories.find((item) => item.id === payload.memoryId) ?? null;
  return { answer, memory };
}

/** 스트리밍 중 아직 완성되지 않은 JSON에서 answer 문자열의 현재 부분만 안전하게 꺼낸다. */
export function parsePartialGptAnswer(content: string): string {
  const match = /"answer"\s*:\s*"/.exec(content);
  if (!match) return "";

  let answer = "";
  let index = match.index + match[0].length;

  while (index < content.length) {
    const character = content[index];
    if (character === '"') break;

    if (character !== "\\") {
      answer += character;
      index += 1;
      continue;
    }

    const escape = content[index + 1];
    if (escape === undefined) break;

    const escapes: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };

    if (escape in escapes) {
      answer += escapes[escape];
      index += 2;
      continue;
    }

    if (escape === "u") {
      const hex = content.slice(index + 2, index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
      answer += String.fromCharCode(Number.parseInt(hex, 16));
      index += 6;
      continue;
    }

    index += 2;
  }

  return answer;
}

function requestBody(question: string, memories: MemoryUnit[], config: OpenAIConfig) {
  return {
    model: config.model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `[Memory Unit 목록]\n${buildContext(memories)}\n\n[질문]\n${question}`,
      },
    ],
  };
}

async function requestGpt(
  question: string,
  memories: MemoryUnit[],
  config: OpenAIConfig,
  signal: AbortSignal | undefined,
  stream: boolean,
): Promise<Response> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    signal,
    body: JSON.stringify({
      ...requestBody(question, memories, config),
      ...(stream ? { stream: true } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI 요청 실패 (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  return response;
}

export async function askGpt(
  question: string,
  memories: MemoryUnit[],
  config: OpenAIConfig,
  signal?: AbortSignal,
): Promise<GptAnswer> {
  const response = await requestGpt(question, memories, config, signal, false);

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI 응답 형식을 이해할 수 없습니다.");

  return parseGptAnswer(content, memories);
}

/** GPT 답변 텍스트는 점진적으로 알리고, 근거는 전체 응답 검증이 끝난 뒤 반환한다. */
export async function askGptStream(
  question: string,
  memories: MemoryUnit[],
  config: OpenAIConfig,
  onAnswerUpdate: (answer: string) => void,
  signal?: AbortSignal,
): Promise<GptAnswer> {
  const response = await requestGpt(question, memories, config, signal, true);
  if (!response.body) throw new Error("OpenAI 스트리밍 응답을 읽을 수 없습니다.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let eventBuffer = "";
  let content = "";
  let lastAnswer = "";

  const consumeEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data || data === "[DONE]") return;

    const payload = JSON.parse(data);
    const delta = payload?.choices?.[0]?.delta?.content;
    if (typeof delta !== "string") return;

    content += delta;
    const answer = parsePartialGptAnswer(content);
    if (answer !== lastAnswer) {
      lastAnswer = answer;
      onAnswerUpdate(answer);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    eventBuffer += decoder.decode(value, { stream: !done });

    const events = eventBuffer.split(/\r?\n\r?\n/);
    eventBuffer = events.pop() ?? "";
    events.forEach(consumeEvent);

    if (done) break;
  }

  if (eventBuffer.trim()) consumeEvent(eventBuffer);

  const result = parseGptAnswer(content, memories);
  if (result.answer !== lastAnswer) onAnswerUpdate(result.answer);
  return result;
}
