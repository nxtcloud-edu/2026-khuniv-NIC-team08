import { useEffect, useRef } from "react";

import styles from "./LecturePlayer.module.css";

interface LecturePlayerProps {
  src: string;
  /** 선택할 때마다 새 객체로 전달한다. 같은 시각을 다시 선택해도 이동시키기 위함. */
  seek?: { seconds: number };
}

export function LecturePlayer({ src, seek }: LecturePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!seek || !videoRef.current) return;
    videoRef.current.currentTime = seek.seconds;
  }, [seek]);

  return (
    <section className={styles.player} aria-label="강의 영상">
      <div className={styles.header}>
        <h2 className={styles.title}>실제 강의 영상</h2>
        <span className={styles.hint}>발언 선택 시 해당 시각으로 이동</span>
      </div>
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        controls
        preload="metadata"
        aria-label="강의 영상 플레이어"
      >
        브라우저가 HTML 비디오를 지원하지 않습니다.
      </video>
    </section>
  );
}
