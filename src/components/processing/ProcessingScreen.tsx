import { useEffect, useMemo, useRef, useState } from "react";

import type { DemoSession } from "../../types/session";
import styles from "./ProcessingScreen.module.css";

/**
 * 사전 계산된 파이프라인 결과를 순서대로 되짚어 보여주는 화면.
 * 화면에 뜨는 수치와 썸네일은 모두 session.json이 실제로 담고 있는 값이다.
 */

const TICK_MS = 80;
const VISIBLE_PAIRS = 4; // 스트립에 한 번에 보이는 프레임-페이지 쌍

interface Stage {
  key: string;
  label: string;
  detail: string;
  from: number;
  to: number;
  total: number;
  unit: string;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function buildStages(session: DemoSession): Stage[] {
  const stats = session.pipeline;
  if (!stats) return [];
  return [
    {
      key: "frames",
      label: "영상에서 화면 추출",
      detail: `${stats.sampleIntervalSeconds}초 간격으로 강의 화면을 읽는 중`,
      from: 0,
      to: 0.24,
      total: stats.sampledFrames,
      unit: "프레임",
    },
    {
      key: "slides",
      label: "화면 변화 감지 · 강의 자료 매칭",
      detail: `추출한 화면을 PDF ${stats.pdfPages}페이지와 대조하는 중`,
      from: 0.24,
      to: 0.62,
      total: stats.slideSegments,
      unit: "구간",
    },
    {
      key: "cues",
      label: "녹음 전사 정렬",
      detail: "발언을 그때 보고 있던 화면에 붙이는 중",
      from: 0.62,
      to: 0.84,
      total: stats.transcriptCues,
      unit: "발언",
    },
    {
      key: "memory",
      label: "Memory Unit 생성",
      detail: "말·화면·시각을 하나의 기억으로 묶는 중",
      from: 0.84,
      to: 1,
      total: stats.memoryUnits,
      unit: "개",
    },
  ];
}

interface ProcessingScreenProps {
  session: DemoSession;
  durationMs?: number;
  onDone: () => void;
}

export function ProcessingScreen({ session, durationMs = 12000, onDone }: ProcessingScreenProps) {
  const [progress, setProgress] = useState(0);
  // onDone이 매 렌더 새 함수여도 타이머가 다시 시작되지 않게 한다
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (durationMs <= 0) {
      doneRef.current();
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const next = clamp01((Date.now() - startedAt) / durationMs);
      setProgress(next);
      if (next >= 1) {
        clearInterval(timer);
        doneRef.current();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [durationMs]);

  const stages = useMemo(() => buildStages(session), [session]);
  const segments = session.segments ?? [];
  const pageThumbnails = useMemo(
    () => new Map(session.pages.map((page) => [page.pageNumber, page.thumbnailPath ?? page.imagePath])),
    [session.pages],
  );

  const activeIndex = stages.findIndex((stage) => progress < stage.to);
  const active = stages[activeIndex === -1 ? stages.length - 1 : activeIndex];

  // 매칭 단계 동안 프레임-페이지 쌍이 하나씩 확정되는 것을 보여준다
  const matchedCount = active
    ? Math.round(clamp01((progress - stages[1].from) / (stages[1].to - stages[1].from)) * segments.length)
    : 0;
  const visiblePairs = segments.slice(Math.max(0, matchedCount - VISIBLE_PAIRS), matchedCount);

  const skip = () => {
    setProgress(1);
    doneRef.current();
  };

  return (
    <main
      className={styles.screen}
      aria-label="강의 분석 중"
      aria-busy={progress < 1}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") skip();
      }}
      tabIndex={-1}
    >
      <div className={styles.card}>
        <header className={styles.head}>
          <span className={styles.badge}>
            <span className={styles.pulse} aria-hidden="true" />
            AI 분석 중
          </span>
          <h1 className={styles.title}>{session.title}</h1>
          <p className={styles.subtitle}>{active?.detail}</p>
        </header>

        <div
          className={styles.bar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className={styles.barFill} style={{ width: `${progress * 100}%` }} />
        </div>

        <p className={styles.liveLabel} role="status" aria-live="polite">
          {active?.label}
        </p>

        <div className={styles.strip} aria-hidden="true">
          {visiblePairs.length === 0 ? (
            <p className={styles.stripEmpty}>강의 화면을 읽는 중…</p>
          ) : (
            visiblePairs.map((segment) => (
              <div key={segment.index} className={styles.pair}>
                <img className={styles.shot} src={segment.thumbnailPath} alt="" />
                <span className={styles.arrow}>→</span>
                <img className={styles.shot} src={pageThumbnails.get(segment.pageNumber)} alt="" />
                <span className={styles.pairMeta}>p{segment.pageNumber}</span>
              </div>
            ))
          )}
        </div>

        <ol className={styles.stages}>
          {stages.map((stage, index) => {
            const ratio = clamp01((progress - stage.from) / (stage.to - stage.from));
            const state = ratio >= 1 ? "done" : ratio > 0 ? "active" : "waiting";
            return (
              <li key={stage.key} className={styles.stage} data-state={state}>
                <span className={styles.stageMark} aria-hidden="true">
                  {state === "done" ? "✓" : index + 1}
                </span>
                <span className={styles.stageLabel}>{stage.label}</span>
                <span className={styles.stageCount}>
                  {Math.round(ratio * stage.total).toLocaleString("ko-KR")}
                  <span className={styles.stageTotal}> / {stage.total.toLocaleString("ko-KR")}</span>
                  <span className={styles.stageUnit}> {stage.unit}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <button type="button" className={styles.skip} onClick={skip}>
          건너뛰기
        </button>
      </div>
    </main>
  );
}
