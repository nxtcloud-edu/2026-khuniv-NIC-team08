import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MemoryUnit } from "../../types/session";
import { buildAnswer, searchMemory } from "../../lib/search";
import {
  askGpt,
  envApiKey,
  envModel,
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

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; outcome: Outcome };

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
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 늦게 도착한 이전 요청의 응답을 버리기 위한 순번
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const updateApiKey = (nextKey: string) => {
    setApiKey(nextKey);
    writeStoredApiKey(nextKey);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length === 0) return;

    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const requestId = ++requestIdRef.current;
    setState({ status: "searching" });

    const config = resolveConfig(apiKey);
    if (!config) {
      timerRef.current = setTimeout(() => {
        setState({ status: "done", outcome: localOutcome(trimmed, memories) });
      }, SEARCH_DELAY_MS);
      return;
    }

    askGpt(trimmed, memories, config)
      .then((gpt) => {
        if (requestIdRef.current !== requestId) return;
        setState({
          status: "done",
          outcome: { memory: gpt.memory, answer: gpt.answer },
        });
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setState({
          status: "done",
          outcome: {
            ...localOutcome(trimmed, memories),
            error: error instanceof Error ? error.message : "OpenAI 호출에 실패했습니다.",
          },
        });
      });
  };

  const connected = resolveConfig(apiKey) !== null;

  return (
    <section className={styles.panel} aria-label="질문과 답변">
      <ApiKeySettings apiKey={apiKey} onChange={updateApiKey} />

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="question-input">
          질문
        </label>
        <input
          id="question-input"
          className={styles.input}
          type="text"
          autoComplete="off"
          placeholder="예) 시험에 나온다고 한 부분이 뭐야?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          type="submit"
          className={styles.submit}
          disabled={state.status === "searching"}
        >
          검색
        </button>
      </form>

      <p className={styles.note}>
        {connected
          ? `OpenAI ${envModel()} · Memory Unit을 근거로 답변 생성`
          : "Local demo data · 사전 처리된 세션에서 로컬 검색"}
      </p>

      <div className={styles.result} aria-live="polite">
        {state.status === "searching" && (
          <p className={styles.searching}>
            <span className={styles.spinner} aria-hidden="true" />
            {connected ? "OpenAI에 근거와 함께 묻는 중..." : "로컬 데이터에서 근거를 찾는 중..."}
          </p>
        )}

        {state.status === "done" && (
          <>
            {state.outcome.error && (
              <p className={styles.error}>
                {state.outcome.error} · 로컬 검색 결과를 대신 보여줍니다.
              </p>
            )}

            {state.outcome.answer === null ? (
              <p className={styles.empty}>{EMPTY_MESSAGE}</p>
            ) : (
              <p className={styles.answer}>{state.outcome.answer}</p>
            )}

            {state.outcome.memory && (
              <>
                <h3 className={styles.evidenceTitle}>근거</h3>
                <EvidenceCard
                  memory={state.outcome.memory}
                  onSelect={onSelectEvidence}
                />
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
