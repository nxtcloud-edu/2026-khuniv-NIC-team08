import type { PipelineStats } from "../../types/session";
import styles from "./HeaderStatus.module.css";

export interface HeaderStatusProps {
  title: string;
  duration: string;
  memoryCount: number;
  onRestart: () => void;
  /** 실제 강의 세션에만 있다 */
  pipeline?: PipelineStats;
}

/** 세션 이름, 데모 표시, 길이와 Memory Unit 개수를 보여주는 상태 헤더. */
export function HeaderStatus({
  title,
  duration,
  memoryCount,
  onRestart,
  pipeline,
}: HeaderStatusProps) {
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <button
          type="button"
          className={styles.logo}
          aria-label="AnythingNote — 자료 입력 화면으로 돌아가기"
          onClick={onRestart}
        >
          <span className={styles.logoMark} aria-hidden="true">
            AN
          </span>
          AnythingNote
        </button>
        <span className={styles.divider} aria-hidden="true" />
        <h1 className={styles.title} title={`Topic : ${title}`}>
          Topic : <span>{title}</span>
        </h1>
      </div>

      <div className={styles.status}>
        <span className={styles.demoBadge}>
          <span className={styles.dot} aria-hidden="true" />
          On-device concept demo · Local demo data
        </span>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>세션 길이</span>
            <span className={styles.metricValue}>{duration}</span>
          </div>
          {pipeline ? (
            <div className={styles.metric}>
              <span className={styles.metricLabel}>슬라이드 구간</span>
              <span className={styles.metricValue}>{pipeline.slideSegments}개</span>
            </div>
          ) : null}
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Memory Unit</span>
            <span className={styles.metricValue}>{memoryCount}개</span>
          </div>
        </div>
      </div>
    </header>
  );
}
