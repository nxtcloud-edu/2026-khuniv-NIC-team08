import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MemoryUnit } from "../../types/session";
import { buildAnswer, searchMemory, type MemorySearchResult } from "../../lib/search";
import { EvidenceCard } from "./EvidenceCard";
import styles from "./QuestionPanel.module.css";

// 검색 자체는 로컬 계산이라 즉시 끝나므로, 검색 중 상태를 보여주기 위한 연출용 지연
const SEARCH_DELAY_MS = 400;

const EMPTY_MESSAGE = "관련 근거를 찾지 못했습니다.";

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; result: MemorySearchResult | null };

interface QuestionPanelProps {
  memories: MemoryUnit[];
  onSelectEvidence: (memory: MemoryUnit) => void;
}

export function QuestionPanel({ memories, onSelectEvidence }: QuestionPanelProps) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length === 0) return;

    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setState({ status: "searching" });
    timerRef.current = setTimeout(() => {
      setState({ status: "done", result: searchMemory(trimmed, memories) });
    }, SEARCH_DELAY_MS);
  };

  return (
    <section className={styles.panel} aria-label="질문과 답변">
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

      <p className={styles.note}>Local demo data · 사전 처리된 세션에서 로컬 검색</p>

      <div className={styles.result} aria-live="polite">
        {state.status === "searching" && (
          <p className={styles.searching}>
            <span className={styles.spinner} aria-hidden="true" />
            로컬 데이터에서 근거를 찾는 중...
          </p>
        )}

        {state.status === "done" && state.result === null && (
          <p className={styles.empty}>{EMPTY_MESSAGE}</p>
        )}

        {state.status === "done" && state.result !== null && (
          <>
            <p className={styles.answer}>{buildAnswer(state.result.memory)}</p>
            <h3 className={styles.evidenceTitle}>근거</h3>
            <EvidenceCard
              memory={state.result.memory}
              onSelect={onSelectEvidence}
            />
          </>
        )}
      </div>
    </section>
  );
}
