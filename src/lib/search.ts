import type { MemoryImportance, MemoryUnit } from "../types/session";

export interface MemorySearchResult {
  memory: MemoryUnit;
  score: number;
}

/** 의도 판별에 쓰는 중요도 (normal은 의도 없음) */
type IntentImportance = Exclude<MemoryImportance, "normal">;

/** 질문 표현이 달라도 같은 의도로 묶기 위한 동의어 그룹 */
const CONCEPT_SYNONYMS: Record<IntentImportance, string[]> = {
  exam: ["시험", "출제", "나온다", "나옵니다", "나오는", "평가", "시험범위"],
  assignment: ["과제", "제출", "마감", "기한", "언제까지", "리포트", "레포트"],
  key: ["핵심", "중요", "개념", "요점", "정리"],
};

const KEYWORD_WEIGHT = 3;
const TRANSCRIPT_WEIGHT = 2;
const SUMMARY_WEIGHT = 1;
const INTENT_BONUS = 4;

const ANSWER_PREFIX: Record<MemoryImportance, string> = {
  exam: "시험에서 언급된 부분입니다.",
  assignment: "과제와 관련된 안내입니다.",
  key: "강의의 핵심 개념 설명입니다.",
  normal: "관련된 발언을 찾았습니다.",
};

/** 소문자화 후 공백·문장부호·기호를 제거해 비교용 문자열을 만든다. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

/** "00:18:32" → "18:32" (시가 0일 때만 축약) */
export function formatTimestamp(timestamp: string): string {
  const parts = timestamp.split(":");
  if (parts.length === 3 && parts[0] === "00") {
    return `${parts[1]}:${parts[2]}`;
  }
  return timestamp;
}

/** 데모 데이터의 keywords와 동의어를 합친 검색 어휘 */
function buildVocabulary(memories: MemoryUnit[]): string[] {
  const vocabulary = new Set<string>();
  for (const terms of Object.values(CONCEPT_SYNONYMS)) {
    terms.forEach((term) => vocabulary.add(term));
  }
  for (const memory of memories) {
    memory.keywords.forEach((keyword) => vocabulary.add(keyword));
  }
  return [...vocabulary];
}

/** 질문 안에 실제로 등장한 어휘만 남긴다. */
export function extractQueryTerms(
  question: string,
  memories: MemoryUnit[],
): string[] {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return [];

  return buildVocabulary(memories).filter((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm.length > 0 && normalizedQuestion.includes(normalizedTerm);
  });
}

/** 질문이 가리키는 중요도 의도들 */
function detectIntents(terms: string[]): Set<IntentImportance> {
  const normalizedTerms = new Set(terms.map(normalizeText));
  const intents = new Set<IntentImportance>();

  for (const [importance, synonyms] of Object.entries(CONCEPT_SYNONYMS)) {
    const hit = synonyms.some((synonym) =>
      normalizedTerms.has(normalizeText(synonym)),
    );
    if (hit) intents.add(importance as IntentImportance);
  }
  return intents;
}

function scoreMemory(
  memory: MemoryUnit,
  terms: string[],
  intents: Set<IntentImportance>,
): number {
  const normalizedKeywords = new Set(memory.keywords.map(normalizeText));
  const normalizedTranscript = normalizeText(memory.transcript);
  const normalizedSummary = normalizeText(memory.summary);

  let score = 0;
  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    if (normalizedKeywords.has(normalizedTerm)) score += KEYWORD_WEIGHT;
    if (normalizedTranscript.includes(normalizedTerm)) score += TRANSCRIPT_WEIGHT;
    if (normalizedSummary.includes(normalizedTerm)) score += SUMMARY_WEIGHT;
  }

  if (memory.importance !== "normal" && intents.has(memory.importance)) {
    score += INTENT_BONUS;
  }
  return score;
}

/**
 * 질문과 가장 관련 있는 Memory Unit 하나를 결정적으로 고른다.
 * 일치하는 어휘가 없거나 점수가 0이면 추측하지 않고 null을 반환한다.
 */
export function searchMemory(
  question: string,
  memories: MemoryUnit[],
): MemorySearchResult | null {
  const terms = extractQueryTerms(question, memories);
  if (terms.length === 0) return null;

  const intents = detectIntents(terms);

  let best: MemorySearchResult | null = null;
  for (const memory of memories) {
    const score = scoreMemory(memory, terms, intents);
    // 동점이면 배열 순서가 앞선 항목을 유지해 결과를 결정적으로 만든다.
    if (score > 0 && (best === null || score > best.score)) {
      best = { memory, score };
    }
  }
  return best;
}

/** 선택된 Memory Unit으로 시각·페이지가 포함된 한국어 답변을 만든다. */
export function buildAnswer(memory: MemoryUnit): string {
  return `${ANSWER_PREFIX[memory.importance]} ${formatTimestamp(memory.timestamp)} · PDF ${memory.pageNumber}페이지 장면이며, 요약하면 "${memory.summary}"입니다.`;
}
