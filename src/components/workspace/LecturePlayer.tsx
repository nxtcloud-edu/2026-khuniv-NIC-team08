import { useEffect, useRef } from "react";

import styles from "./LecturePlayer.module.css";

interface LecturePlayerProps {
  src: string;
  /** 선택할 때마다 새 객체로 전달한다. 같은 시각을 다시 선택해도 이동시키기 위함. */
  seek?: { seconds: number };
  /** 초 단위로만 알린다 (timeupdate는 초당 4회 이상 발생) */
  onTimeUpdate?: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

export function LecturePlayer({ src, seek, onTimeUpdate, onPlayingChange }: LecturePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSecondRef = useRef(-1);

  useEffect(() => {
    if (!seek || !videoRef.current) return;
    videoRef.current.currentTime = seek.seconds;
  }, [seek]);

  const handleTimeUpdate = () => {
    const seconds = Math.floor(videoRef.current?.currentTime ?? 0);
    if (seconds === lastSecondRef.current) return;
    lastSecondRef.current = seconds;
    onTimeUpdate?.(seconds);
  };

  return (
    <section className={styles.player} aria-label="강의 영상">
      <div className={styles.header}>
        <h2 className={styles.title}>Video</h2>
        <span className={styles.hint}>재생하면 문서와 타임라인이 따라 이동</span>
      </div>
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        controls
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => onPlayingChange?.(true)}
        onPause={() => onPlayingChange?.(false)}
        aria-label="강의 영상 플레이어"
      >
        브라우저가 HTML 비디오를 지원하지 않습니다.
      </video>
    </section>
  );
}
