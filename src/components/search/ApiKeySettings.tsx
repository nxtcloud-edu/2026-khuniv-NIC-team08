import { envModel } from "../../lib/openai";
import styles from "./ApiKeySettings.module.css";

interface ApiKeySettingsProps {
  apiKey: string;
  onChange: (apiKey: string) => void;
}

/** OpenAI API 키 입력칸. 키가 비어 있으면 앱은 로컬 키워드 검색으로 동작한다. */
export function ApiKeySettings({ apiKey, onChange }: ApiKeySettingsProps) {
  const connected = apiKey.trim().length > 0;

  return (
    <details className={styles.box}>
      <summary className={styles.summary}>
        <span className={styles.summaryLabel}>OpenAI 연결</span>
        <span className={styles.state} data-connected={connected}>
          {connected ? `연결됨 · ${envModel()}` : "미연결 · 로컬 검색"}
        </span>
      </summary>

      <div className={styles.body}>
        <label className={styles.label} htmlFor="openai-api-key">
          API 키
        </label>
        <input
          id="openai-api-key"
          className={styles.input}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-..."
          value={apiKey}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className={styles.clear} onClick={() => onChange("")}>
          지우기
        </button>
        <p className={styles.hint}>
          키는 이 브라우저에만 저장되고 요청은 브라우저에서 OpenAI로 직접 전송됩니다.
          비워 두면 <code>.env</code>의 <code>VITE_OPENAI_API_KEY</code>를 쓰고, 그것도 없으면 로컬 검색으로 답합니다.
        </p>
      </div>
    </details>
  );
}
