/**
 * 슬라이드 구간에 제목·요약·중요도·키워드를 붙인다.
 *
 * 기본은 OpenAI 호출이고, 키가 없거나 호출이 실패하면 규칙 기반으로 떨어진다.
 * (시연 전날 네트워크 문제로 파이프라인이 멈추지 않게 하기 위함)
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

const IMPORTANCE = new Set(["exam", "assignment", "key", "normal"]);

// 발언이 아주 많은 구간이 프롬프트를 삼켜 응답이 잘리는 것을 막는다
const MAX_CUES_PER_SEGMENT = 18;
const MAX_CUE_CHARS = 240;

// 규칙 기반 경로와 LLM 결과 검증에 함께 쓰는 신호어
const IMPORTANCE_HINTS = [
  ["exam", ["시험", "출제", "나옵니다", "나올", "퀴즈", "quiz", "평가"]],
  ["assignment", ["과제", "숙제", "제출", "마감", "리포트", "레포트"]],
  ["key", ["중요", "핵심", "정의", "기억", "포인트"]],
];

const SYSTEM_PROMPT = `너는 강의 녹화를 정리하는 한국어 조교다.
슬라이드 한 장이 화면에 떠 있던 동안의 발언 묶음을 받아서, 그 구간을 노트로 정리한다.

각 구간마다 다음을 만든다.
- title: 그 슬라이드의 주제를 나타내는 8자 이내의 짧은 한국어 명사구. 문장으로 쓰지 않는다.
- summary: 그 구간에서 설명한 내용을 한 문장으로 요약. "~함", "~설명함" 형태로 끝낸다.
- importance: 시험/퀴즈 언급이면 "exam", 과제·제출 언급이면 "assignment", 핵심 개념 설명이면 "key", 그 외에는 "normal".
- keywords: 검색에 쓸 한국어·영어 키워드 3~7개. 발언에 실제로 등장한 말만 쓴다.
- anchorIndex: 그 구간을 대표하는 발언의 번호. 주어진 발언 목록 안에서 고른다.

주어진 발언에 없는 내용을 지어내지 않는다. 전사에 오타가 있어도 원문 표현을 존중한다.

반드시 아래 형태의 JSON 객체 하나만 출력한다.
{"segments": [{"index": 0, "title": "...", "summary": "...", "importance": "key", "keywords": ["..."], "anchorIndex": 0}]}`;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** 원래 번호는 유지한 채 내용이 많은 발언만 남긴다 (anchorIndex가 실제 배열을 가리켜야 함) */
function selectCues(cues) {
  const indexed = cues.map((cue, index) => ({ index, text: cue.text.slice(0, MAX_CUE_CHARS) }));
  if (indexed.length <= MAX_CUES_PER_SEGMENT) return indexed;
  return [...indexed]
    .sort((left, right) => right.text.length - left.text.length)
    .slice(0, MAX_CUES_PER_SEGMENT)
    .sort((left, right) => left.index - right.index);
}

function buildBatchPrompt(batch, offset) {
  return batch
    .map((segment, index) => {
      const cues = selectCues(segment.cues)
        .map((cue) => `    [${cue.index}] ${cue.text}`)
        .join("\n");
      return `구간 ${offset + index} (PDF ${segment.pageNumber}페이지, ${formatTime(segment.start)}~${formatTime(segment.end)})\n${cues}`;
    })
    .join("\n\n");
}

/** 구간에서 가장 긴 발언의 번호 (대표 발언의 기본값) */
function longestCueIndex(cues) {
  let best = 0;
  for (let index = 1; index < cues.length; index += 1) {
    if (cues[index].text.length > cues[best].text.length) best = index;
  }
  return best;
}

function detectImportance(text) {
  for (const [importance, hints] of IMPORTANCE_HINTS) {
    if (hints.some((hint) => text.includes(hint))) return importance;
  }
  return "normal";
}

/** LLM 없이 만드는 최소한의 주석 */
function ruleBasedAnnotation(segment) {
  const anchorIndex = longestCueIndex(segment.cues);
  const text = segment.cues.map((cue) => cue.text).join(" ");
  const anchor = segment.cues[anchorIndex].text;
  const words = [...new Set(text.split(/[\s,.·]+/).filter((word) => word.length >= 2))];

  return {
    title: `${segment.pageNumber}페이지`,
    summary: `${anchor.slice(0, 60).trim()}${anchor.length > 60 ? "..." : ""}`,
    importance: detectImportance(text),
    keywords: words.slice(0, 6),
    anchorIndex,
  };
}

/** 모델 응답을 실제 구간과 대조해 안전한 값으로 만든다. */
function normalizeAnnotation(raw, segment) {
  const fallback = ruleBasedAnnotation(segment);
  if (!raw || typeof raw !== "object" || typeof raw.summary !== "string" || !raw.summary.trim()) {
    return { ...fallback, fallback: true };
  }

  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 24) : fallback.title;
  const summary = typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim() : fallback.summary;
  const importance = IMPORTANCE.has(raw.importance) ? raw.importance : fallback.importance;
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((keyword) => typeof keyword === "string" && keyword.trim()).map((keyword) => keyword.trim()).slice(0, 8)
    : fallback.keywords;
  const anchorIndex =
    Number.isInteger(raw.anchorIndex) && raw.anchorIndex >= 0 && raw.anchorIndex < segment.cues.length
      ? raw.anchorIndex
      : fallback.anchorIndex;

  return { title, summary, importance, keywords: keywords.length ? keywords : fallback.keywords, anchorIndex, fallback: false };
}

/**
 * 같은 프롬프트는 다시 묻지 않는다. 생성기를 손볼 때마다 LLM 비용과 1분을 다시 쓰지 않기 위함.
 * (.gitignore 대상 — 캐시가 없으면 그냥 다시 물어본다)
 */
function makeCache(path) {
  let entries = {};
  try {
    entries = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    // 캐시가 없거나 깨졌으면 빈 상태로 시작한다
  }
  return {
    key: (model, prompt) => createHash("sha256").update(`${model}\n${prompt}`).digest("hex").slice(0, 32),
    get: (key) => entries[key],
    set: (key, value) => {
      entries[key] = value;
      writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`);
    },
  };
}

async function askBatch(batch, offset, config, cache) {
  const prompt = buildBatchPrompt(batch, offset);
  const cacheKey = cache?.key(config.model, prompt);
  const cached = cacheKey && cache.get(cacheKey);
  if (cached) {
    return batch.map((segment, index) => {
      const raw = cached.find((item) => item?.index === offset + index) ?? cached[index];
      return normalizeAnnotation(raw, segment);
    });
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
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

  const parsed = JSON.parse(content);
  const list = Array.isArray(parsed?.segments) ? parsed.segments : [];
  if (cacheKey && list.length) cache.set(cacheKey, list);
  // 모델이 순서를 바꿔 돌려줘도 index로 다시 맞춘다
  return batch.map((segment, index) => {
    const raw = list.find((item) => item?.index === offset + index) ?? list[index];
    return normalizeAnnotation(raw, segment);
  });
}

export async function annotate(segments, { skipLlm = false, batchSize = 10, env = {}, cachePath, onProgress } = {}) {
  const apiKey = (env.VITE_OPENAI_API_KEY ?? env.OPENAI_API_KEY ?? "").trim();
  const report = (done) => onProgress?.(done, segments.length);

  if (skipLlm || !apiKey) {
    const items = segments.map(ruleBasedAnnotation);
    report(segments.length);
    return { source: skipLlm ? "rule-based" : "rule-based (API 키 없음)", items };
  }

  const config = {
    apiKey,
    model: (env.VITE_OPENAI_MODEL ?? "").trim() || DEFAULT_MODEL,
    baseUrl: ((env.VITE_OPENAI_BASE_URL ?? "").trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  };

  const cache = cachePath ? makeCache(cachePath) : null;
  const items = [];
  for (let offset = 0; offset < segments.length; offset += batchSize) {
    const batch = segments.slice(offset, offset + batchSize);
    try {
      items.push(...(await askBatch(batch, offset, config, cache)));
    } catch (error) {
      // 한 배치가 실패해도 전체를 버리지 않는다
      console.warn(`\n      배치 ${offset} 실패: ${error.message}`);
      items.push(...batch.map((segment) => ({ ...ruleBasedAnnotation(segment), fallback: true })));
    }
    report(items.length);
  }

  // 응답이 잘려 빠진 구간은 하나씩 다시 묻는다 (긴 구간에서 주로 발생)
  const missing = items.reduce((list, item, index) => (item.fallback ? [...list, index] : list), []);
  for (const index of missing) {
    try {
      const [retried] = await askBatch([segments[index]], index, config, cache);
      if (!retried.fallback) items[index] = retried;
    } catch {
      // 재시도도 실패하면 규칙 기반 결과를 그대로 둔다
    }
  }

  const remaining = items.filter((item) => item.fallback).length;
  if (missing.length) console.log(`\n      재시도 ${missing.length}개 → 규칙 기반으로 남은 구간 ${remaining}개`);
  return {
    source: remaining ? `openai:${config.model} (${remaining}개 규칙 기반)` : `openai:${config.model}`,
    items,
  };
}
