import type { MemoryImportance, MemoryUnit } from "../../types/session";
import { formatTimestamp } from "../../lib/search";
import styles from "./EvidenceCard.module.css";

const IMPORTANCE_LABEL: Record<MemoryImportance, string> = {
  exam: "시험",
  assignment: "과제",
  key: "핵심",
  normal: "일반",
};

interface EvidenceCardProps {
  memory: MemoryUnit;
  onSelect: (memory: MemoryUnit) => void;
}

export function EvidenceCard({ memory, onSelect }: EvidenceCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      data-importance={memory.importance}
      onClick={() => onSelect(memory)}
    >
      <span className={styles.header}>
        <span className={styles.locator}>
          {formatTimestamp(memory.timestamp)} · PDF {memory.pageNumber}페이지
        </span>
        <span className={styles.badge} data-importance={memory.importance}>
          {IMPORTANCE_LABEL[memory.importance]}
        </span>
      </span>
      <span className={styles.transcript}>“{memory.transcript}”</span>
      <span className={styles.summary}>{memory.summary}</span>
      <span className={styles.hint}>선택하면 해당 장면으로 이동합니다</span>
    </button>
  );
}
