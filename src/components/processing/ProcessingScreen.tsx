import { useEffect, useRef, useState } from "react";

import type { DemoSession } from "../../types/session";
import styles from "./ProcessingScreen.module.css";

const TICK_MS = 80;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function statusAt(progress: number) {
  if (progress < 0.27) return "자료를 읽고 있어요";
  if (progress < 0.57) return "장면과 페이지를 연결하고 있어요";
  if (progress < 0.82) return "중요한 내용을 정리하고 있어요";
  return "노트를 완성하고 있어요";
}

interface ProcessingScreenProps {
  session: DemoSession;
  durationMs?: number;
  onDone: () => void;
}

export function ProcessingScreen({ session, durationMs = 12000, onDone }: ProcessingScreenProps) {
  const [progress, setProgress] = useState(0);
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
    const timer = window.setInterval(() => {
      const next = clamp01((Date.now() - startedAt) / durationMs);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(timer);
        doneRef.current();
      }
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [durationMs]);

  const skip = () => {
    setProgress(1);
    doneRef.current();
  };

  const percentage = Math.round(progress * 100);

  return (
    <main
      className={styles.screen}
      aria-label="노트 변환 중"
      aria-busy={progress < 1}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") skip();
      }}
      tabIndex={-1}
    >
      <section className={styles.content} aria-labelledby="processing-title">
        <div className={styles.iconScene} aria-hidden="true">
          <svg className={styles.icon} viewBox="0 0 180 170">
            <defs>
              <linearGradient id="note-paper" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#eef8f8" />
              </linearGradient>
            </defs>
            <path
              className={styles.noteShadow}
              d="M50 44h83a10 10 0 0 1 10 10v93a10 10 0 0 1-10 10H50a10 10 0 0 1-10-10V54a10 10 0 0 1 10-10Z"
            />
            <path
              className={styles.note}
              d="M48 39h83a10 10 0 0 1 10 10v93a10 10 0 0 1-10 10H48a10 10 0 0 1-10-10V49a10 10 0 0 1 10-10Z"
            />
            <path className={styles.noteFold} d="M114 39v24h27" />
            <path className={styles.noteLine} d="M62 87h54M62 102h45M62 117h50" />
            <g className={styles.incomingPaper}>
              <path d="M27 16h54l18 18v63H27z" />
              <path d="M81 16v18h18" />
              <path d="M42 53h39M42 66h31" />
            </g>
            <g className={styles.sparkles}>
              <path d="M150 65v14M143 72h14" />
              <path d="M24 113v10M19 118h10" />
            </g>
          </svg>
        </div>

        <h1 id="processing-title" className={styles.title}>
          노트를 만들고 있어요
        </h1>
        <p className={styles.sessionTitle}>{session.title}</p>

        <div className={styles.progressArea}>
          <div className={styles.statusRow}>
            <span role="status" aria-live="polite">
              {statusAt(progress)}
            </span>
            <span className={styles.percentage}>{percentage}%</span>
          </div>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label="노트 생성 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <div className={styles.barFill} style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <button type="button" className={styles.skip} onClick={skip}>
          바로 열기
        </button>
      </section>
    </main>
  );
}
