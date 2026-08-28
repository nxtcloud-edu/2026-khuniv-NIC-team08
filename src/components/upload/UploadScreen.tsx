import { useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";

import styles from "./UploadScreen.module.css";

const ACCEPTED_FILES =
  "video/*,audio/*,application/pdf,.pdf,.ppt,.pptx,.doc,.docx,.txt,.md";

function sameFile(left: File, right: File) {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified
  );
}

interface UploadScreenProps {
  onStart: (files: File[], prompt: string) => void;
}

export function UploadScreen({ onStart }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    setFiles((current) => {
      const next = [...current];
      Array.from(incoming).forEach((file) => {
        if (!next.some((saved) => sameFile(saved, file))) next.push(file);
      });
      return next;
    });
  };

  const submit = () => {
    if (files.length === 0) return;
    onStart(files, prompt.trim());
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="upload-title">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span />
          </span>
          <span>AnythingNote</span>
        </div>

        <div className={styles.intro}>
          <h1 id="upload-title" className={styles.title}>
            무엇이든, 기억으로 만들어 보세요
          </h1>
          <p className={styles.subtitle}>
            자료와 원하는 내용을 함께 입력하면 찾아볼 수 있는 노트로 정리해 드려요.
          </p>
        </div>

        <form
          className={styles.composer}
          aria-label="자료와 프롬프트 입력"
          data-dragging={isDragging ? "true" : "false"}
          onSubmit={handleSubmit}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          {files.length > 0 ? (
            <ul className={styles.files} aria-label="첨부한 자료">
              {files.map((file) => (
                <li className={styles.file} key={`${file.name}-${file.size}-${file.lastModified}`}>
                  <span className={styles.fileIcon} aria-hidden="true">
                    <svg viewBox="0 0 20 20">
                      <path d="M5.5 2.75h5.4l3.6 3.6v10.9h-9z" />
                      <path d="M10.9 2.75v3.6h3.6" />
                    </svg>
                  </span>
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`${file.name} 삭제`}
                    onClick={() => setFiles((current) => current.filter((saved) => saved !== file))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <textarea
            className={styles.prompt}
            aria-label="프롬프트"
            value={prompt}
            rows={3}
            placeholder="자료와 함께 만들고 싶은 노트를 설명해 주세요"
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handlePromptKeyDown}
          />

          <div className={styles.actions}>
            <input
              ref={inputRef}
              className={styles.input}
              type="file"
              multiple
              accept={ACCEPTED_FILES}
              aria-label="자료 첨부"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className={styles.attach}
              onClick={() => inputRef.current?.click()}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6.3 10.7 11.9 5a2.7 2.7 0 0 1 3.8 3.8l-7 7a4 4 0 0 1-5.7-5.7l7.2-7.2" />
              </svg>
              자료 첨부
            </button>
            <span className={styles.hint}>PDF · 영상 · 녹음 등</span>
            <button
              type="submit"
              className={styles.send}
              disabled={files.length === 0}
              aria-label="노트 만들기"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m5 10 5-5 5 5M10 5v10" />
              </svg>
            </button>
          </div>

          {isDragging ? <div className={styles.dropOverlay}>여기에 자료를 놓아주세요</div> : null}
        </form>

        <p className={styles.footnote}>자료는 이 시연 화면에서 실제로 업로드되지 않습니다.</p>
      </section>
    </main>
  );
}
