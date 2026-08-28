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
- 주어진 Memory Unit 목록에 있는 내용만 사용한다. 목록 밖의 지식으로 보충하지 않는다.
- 답변에 근거가 된 발언 시각과 PDF 페이지 번호를 자연스럽게 포함한다.
- 관련 Memory Unit이 없으면 추측하지 말고 근거가 없다고 답한다.
- 답변은 2~3문장 이내의 한국어로 쓴다.

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

export async function askGpt(
  question: string,
  memories: MemoryUnit[],
  config: OpenAIConfig,
  signal?: AbortSignal,
): Promise<GptAnswer> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `[Memory Unit 목록]\n${buildContext(memories)}\n\n[질문]\n${question}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI 요청 실패 (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI 응답 형식을 이해할 수 없습니다.");

  return parseGptAnswer(content, memories);
}
