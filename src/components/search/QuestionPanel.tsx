import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MemoryUnit } from "../../types/session";
import { buildAnswer, searchMemory } from "../../lib/search";
import {
  askGptStream,
  envApiKey,
  readStoredApiKey,
  resolveConfig,
  writeStoredApiKey,
} from "../../lib/openai";
import { ApiKeySettings } from "./ApiKeySettings";
import { EvidenceCard } from "./EvidenceCard";
import styles from "./QuestionPanel.module.css";

// 로컬 검색은 즉시 끝나므로, 검색 중 상태를 보여주기 위한 연출용 지연
const SEARCH_DELAY_MS = 400;

const EMPTY_MESSAGE = "관련 근거를 찾지 못했습니다.";

interface Outcome {
  /** null이면 근거 없음 */
  memory: MemoryUnit | null;
  /** null이면 EMPTY_MESSAGE를 대신 보여준다 */
  answer: string | null;
  /** GPT 호출이 실패해 로컬 결과로 되돌아갔을 때의 안내 */
  error?: string;
}

type ChatEntry =
  | { kind: "question"; id: string; text: string }
  | { kind: "answer"; id: string; outcome: Outcome; streaming?: boolean };

/** 로컬 키워드 검색 결과 (OpenAI 키가 없거나 호출이 실패했을 때의 경로) */
function localOutcome(question: string, memories: MemoryUnit[]): Outcome {
  const result = searchMemory(question, memories);
  return {
    memory: result?.memory ?? null,
    answer: result ? buildAnswer(result.memory) : null,
  };
}

interface QuestionPanelProps {
  memories: MemoryUnit[];
  onSelectEvidence: (memory: MemoryUnit) => void;
}

export function QuestionPanel({ memories, onSelectEvidence }: QuestionPanelProps) {
  const [question, setQuestion] = useState("");
  // 화면에서 입력한 키가 .env 기본값보다 우선한다
  const [apiKey, setApiKey] = useState(() => readStoredApiKey() || envApiKey());
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 늦게 도착한 이전 요청의 응답을 버리기 위한 순번
  const requestIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const followsLogRef = useRef(true);

  const streamingAnswerLength = entries.reduce(
    (total, entry) =>
      entry.kind === "answer" && entry.streaming
        ? total + (entry.outcome.answer?.length ?? 0)
        : total,
    0,
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // 사용자가 최신 대화를 보고 있을 때만 스트리밍을 따라 내려간다.
  useEffect(() => {
    if (logRef.current && followsLogRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries.length, pending, streamingAnswerLength]);

  const handleLogScroll = () => {
    if (!logRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = logRef.current;
    followsLogRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  const updateApiKey = (nextKey: string) => {
    setApiKey(nextKey);
    writeStoredApiKey(nextKey);
  };

  const answer = (requestId: number, outcome: Outcome) => {
    if (requestIdRef.current !== requestId) return;
    setEntries((current) => [...current, { kind: "answer", id: `a-${requestId}`, outcome }]);
    setPending(false);
  };

  const updateStreamingAnswer = (requestId: number, text: string) => {
    if (requestIdRef.current !== requestId) return;
    setEntries((current) =>
      current.map((entry) =>
        entry.id === `a-${requestId}` && entry.kind === "answer"
          ? { ...entry, outcome: { ...entry.outcome, answer: text } }
          : entry,
      ),
    );
  };

  const finishStreamingAnswer = (requestId: number, outcome: Outcome) => {
    if (requestIdRef.current !== requestId) return;
    setEntries((current) =>
      current.map((entry) =>
        entry.id === `a-${requestId}` && entry.kind === "answer"
          ? { ...entry, outcome, streaming: false }
          : entry,
      ),
    );
    setPending(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length === 0) return;

    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const requestId = ++requestIdRef.current;
    setEntries((current) => [...current, { kind: "question", id: `q-${requestId}`, text: trimmed }]);
    setQuestion("");
    setPending(true);

    const config = resolveConfig(apiKey);
    if (!config) {
      timerRef.current = setTimeout(() => {
        answer(requestId, localOutcome(trimmed, memories));
      }, SEARCH_DELAY_MS);
      return;
    }

    setEntries((current) => [
      ...current,
      {
        kind: "answer",
        id: `a-${requestId}`,
        outcome: { memory: null, answer: "" },
        streaming: true,
      },
    ]);

    askGptStream(trimmed, memories, config, (text) => updateStreamingAnswer(requestId, text))
      .then((gpt) =>
        finishStreamingAnswer(requestId, { memory: gpt.memory, answer: gpt.answer }),
      )
      .catch((error: unknown) =>
        finishStreamingAnswer(requestId, {
          ...localOutcome(trimmed, memories),
          error: error instanceof Error ? error.message : "OpenAI 호출에 실패했습니다.",
        }),
      );
  };

  const connected = resolveConfig(apiKey) !== null;

  return (
    <section className={styles.panel} aria-label="질문과 답변">
      <ApiKeySettings apiKey={apiKey} onChange={updateApiKey} />

      <div
        className={styles.log}
        ref={logRef}
        role="log"
        aria-live="polite"
        onScroll={handleLogScroll}
      >
        {entries.length === 0 && !pending ? (
          <p className={styles.placeholder}>
            강의 내용 질문 시 답변과 timestamp를 찾아줍니다.
          </p>
        ) : null}

        {entries.map((entry) =>
          entry.kind === "question" ? (
            <p key={entry.id} className={styles.question}>
              {entry.text}
            </p>
          ) : (
            <div key={entry.id} className={styles.result}>
              {entry.outcome.error && (
                <p className={styles.error}>
                  {entry.outcome.error} · 로컬 검색 결과를 대신 보여줍니다.
                </p>
              )}

              {entry.streaming && !entry.outcome.answer ? (
                <p className={styles.searching}>
                  <span className={styles.spinner} aria-hidden="true" />
                  GPT 답변을 생성하는 중...
                </p>
              ) : entry.outcome.answer === null ? (
                <p className={styles.empty}>{EMPTY_MESSAGE}</p>
              ) : (
                <p className={styles.answer}>
                  {entry.outcome.answer}
                  {entry.streaming ? (
                    <span className={styles.streamCursor} aria-hidden="true" />
                  ) : null}
                </p>
              )}

              {entry.outcome.memory && (
                <>
                  <h3 className={styles.evidenceTitle}>근거</h3>
                  <EvidenceCard memory={entry.outcome.memory} onSelect={onSelectEvidence} />
                </>
              )}
            </div>
          ),
        )}

        {pending && !connected && (
          <p className={styles.searching}>
            <span className={styles.spinner} aria-hidden="true" />
            {connected ? "OpenAI에 근거와 함께 묻는 중..." : "로컬 데이터에서 근거를 찾는 중..."}
          </p>
        )}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.composer}>
          <input
            id="question-input"
            className={styles.input}
            type="text"
            autoComplete="off"
            aria-label="질문"
            placeholder="예) 시험에 나온다고 한 부분이 뭐야?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button type="submit" className={styles.submit} disabled={pending}>
            검색
          </button>
        </div>
      </form>

      <p className={styles.note}>
        {connected
          ? "Memory Unit을 근거로 답변을 생성합니다."
          : "Local demo data · 사전 처리된 세션에서 로컬 검색"}
      </p>
    </section>
  );
}
