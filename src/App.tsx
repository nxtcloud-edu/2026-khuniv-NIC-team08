import { demoSession } from "./data/demoSession";

/** 기반 검증용 임시 화면. 4번 통합 에이전트가 최종 App으로 교체한다. */
export default function App() {
  return (
    <main
      style={{
        fontFamily: "var(--font-sans)",
        color: "var(--color-text)",
        background: "var(--color-bg)",
        minHeight: "100vh",
        padding: "var(--space-6)",
      }}
    >
      <p
        style={{
          display: "inline-block",
          margin: 0,
          padding: "var(--space-1) var(--space-3)",
          borderRadius: "var(--radius-pill)",
          background: "var(--color-accent-soft)",
          color: "var(--color-accent-strong)",
          fontSize: "var(--text-xs)",
        }}
      >
        Local demo data · On-device concept demo
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)" }}>{demoSession.title}</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        길이 {demoSession.duration} · Memory Unit {demoSession.memories.length}개 ·
        페이지 {demoSession.pages.length}장
      </p>
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        {demoSession.pages.map((page) => (
          <figure key={page.pageNumber} style={{ margin: 0 }}>
            <img
              src={page.imagePath}
              alt={`${page.pageNumber}페이지 ${page.title}`}
              width={320}
              style={{
                display: "block",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-sm)",
              }}
            />
            <figcaption
              style={{
                marginTop: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              {page.pageNumber}p · {page.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
