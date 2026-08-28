import { useEffect, useRef } from "react";

import type { MemoryImportance, MemoryUnit } from "../../types/session";
import styles from "./Timeline.module.css";

export interface TimelineProps {
  memories: MemoryUnit[];
  selectedMemoryId?: string;
  onSelect: (memory: MemoryUnit) => void;
}

const IMPORTANCE_LABEL: Record<MemoryImportance, string> = {
  exam: "시험",
  assignment: "과제",
  key: "핵심",
  normal: "일반",
};

const IMPORTANCE_CLASS: Record<MemoryImportance, string> = {
  exam: styles.badgeExam,
  assignment: styles.badgeAssignment,
  key: styles.badgeKey,
  normal: styles.badgeNormal,
};

/** 발언 시각·원문·연결 페이지·중요도를 시간순으로 보여주는 타임라인. */
export function Timeline({
  memories,
  selectedMemoryId,
  onSelect,
}: TimelineProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // 근거 카드로 선택된 항목이 스크롤 밖에 있어도 보이게 한다.
  useEffect(() => {
    if (!selectedMemoryId) return;
    selectedRef.current?.scrollIntoView?.({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedMemoryId]);

  return (
    <section className={styles.timeline} aria-label="발언 타임라인">
      <div className={styles.head}>
        <h2 className={styles.headTitle}>발언 타임라인</h2>
        <span className={styles.headHint}>발언을 선택하면 해당 페이지로 이동</span>
      </div>

      {memories.length === 0 ? (
        <p className={styles.empty}>표시할 발언이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {memories.map((memory) => {
            const isSelected = memory.id === selectedMemoryId;
            return (
              <li key={memory.id}>
                <button
                  type="button"
                  ref={isSelected ? selectedRef : undefined}
                  className={`${styles.item} ${isSelected ? styles.itemSelected : ""}`}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => onSelect(memory)}
                >
                  <span className={styles.meta}>
                    <span className={styles.timestamp}>{memory.timestamp}</span>
                    <span className={styles.page}>PDF {memory.pageNumber}페이지</span>
                    <span
                      className={`${styles.badge} ${IMPORTANCE_CLASS[memory.importance]}`}
                    >
                      {IMPORTANCE_LABEL[memory.importance]}
                    </span>
                  </span>
                  <span className={styles.transcript}>{memory.transcript}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
