import { useState, type DragEvent } from "react";

import styles from "./UploadScreen.module.css";

export type UploadSlot = "video" | "document" | "audio";

const SLOTS = [
  { key: "video", label: "강의 영상", accept: "video/*", hint: "MP4 · MOV · MKV", icon: "🎬" },
  { key: "document", label: "강의 자료", accept: "application/pdf,.pdf", hint: "PDF", icon: "📄" },
  { key: "audio", label: "녹음 파일", accept: "audio/*", hint: "M4A · WAV · MP3", icon: "🎙️" },
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

interface UploadScreenProps {
  onStart: (files: Partial<Record<UploadSlot, File>>) => void;
}

export function UploadScreen({ onStart }: UploadScreenProps) {
  const [files, setFiles] = useState<Partial<Record<UploadSlot, File>>>({});
  const [draggingOver, setDraggingOver] = useState<UploadSlot | null>(null);

  const take = (slot: UploadSlot, file: File | undefined) => {
    if (!file) return;
    setFiles((current) => ({ ...current, [slot]: file }));
  };

  const handleDrop = (slot: UploadSlot) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingOver(null);
    take(slot, event.dataTransfer.files[0]);
  };

  const ready = SLOTS.every((slot) => files[slot.key]);

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <header className={styles.head}>
          <span className={styles.logo}>
            <span className={styles.logoMark} aria-hidden="true">
              AN
            </span>
            AnythingNote
          </span>
          <h1 className={styles.title}>강의 자료를 올려주세요</h1>
          <p className={styles.subtitle}>
            영상 · 자료 · 녹음을 함께 넣으면 말한 내용과 그때 보던 화면을 하나로 묶어 노트를 만듭니다.
          </p>
        </header>

        <div className={styles.slots}>
          {SLOTS.map((slot) => {
            const file = files[slot.key];
            const inputId = `upload-${slot.key}`;
            return (
              <div
                key={slot.key}
                className={styles.slot}
                data-filled={file ? "true" : "false"}
                data-over={draggingOver === slot.key ? "true" : "false"}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDraggingOver(slot.key);
                }}
                onDragLeave={() => setDraggingOver(null)}
                onDrop={handleDrop(slot.key)}
              >
                <input
                  id={inputId}
                  className={styles.input}
                  type="file"
                  accept={slot.accept}
                  onChange={(event) => take(slot.key, event.target.files?.[0])}
                />
                <label className={styles.slotBody} htmlFor={inputId}>
                  <span className={styles.slotIcon} aria-hidden="true">
                    {file ? "✓" : slot.icon}
                  </span>
                  <span className={styles.slotLabel}>{slot.label}</span>
                  {file ? (
                    <>
                      <span className={styles.fileName} title={file.name}>
                        {file.name}
                      </span>
                      <span className={styles.fileSize}>{formatBytes(file.size)}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.slotHint}>{slot.hint}</span>
                      <span className={styles.slotAction}>끌어다 놓거나 클릭</span>
                    </>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.start}
          disabled={!ready}
          onClick={() => onStart(files)}
        >
          노트 만들기
        </button>
        <p className={styles.note}>
          {ready ? "세 파일이 모두 준비되었습니다." : "세 파일을 모두 넣으면 시작할 수 있습니다."}
        </p>
      </div>
    </main>
  );
}
