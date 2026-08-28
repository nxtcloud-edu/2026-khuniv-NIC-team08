import type { DocumentPage } from "../../types/session";
import styles from "./DocumentViewer.module.css";

export interface DocumentViewerProps {
  pages: DocumentPage[];
  currentPage: number;
  highlightedPage?: number;
  onPageChange: (pageNumber: number) => void;
}

/**
 * 준비된 PDF 페이지 이미지를 보여주는 뷰어.
 * 페이지 번호가 연속적이지 않으므로 이동은 pages 배열 순서를 따른다.
 */
export function DocumentViewer({
  pages,
  currentPage,
  highlightedPage,
  onPageChange,
}: DocumentViewerProps) {
  const index = pages.findIndex((page) => page.pageNumber === currentPage);
  const page = index >= 0 ? pages[index] : undefined;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < pages.length - 1;
  const isHighlighted = page !== undefined && highlightedPage === currentPage;

  return (
    <section className={styles.viewer} aria-label="문서 장면">
      <div className={styles.toolbar}>
        <div className={styles.pageMeta}>
          <span className={styles.pageNumber}>
            PDF {page ? page.pageNumber : currentPage}페이지
          </span>
          {page ? <span className={styles.pageTitle}>{page.title}</span> : null}
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => onPageChange(pages[index - 1].pageNumber)}
            disabled={!hasPrev}
            aria-label="이전 페이지"
          >
            ← 이전
          </button>
          <span className={styles.position}>
            {index >= 0 ? index + 1 : "-"} / {pages.length}
          </span>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => onPageChange(pages[index + 1].pageNumber)}
            disabled={!hasNext}
            aria-label="다음 페이지"
          >
            다음 →
          </button>
        </div>
      </div>

      <div className={styles.stage}>
        {page ? (
          <figure
            className={`${styles.frame} ${isHighlighted ? styles.frameHighlighted : ""}`}
            data-highlighted={isHighlighted ? "true" : "false"}
          >
            <img
              className={styles.image}
              src={page.imagePath}
              alt={`PDF ${page.pageNumber}페이지 — ${page.title}`}
            />
            {isHighlighted ? (
              <figcaption className={styles.evidenceTag}>근거 페이지</figcaption>
            ) : null}
          </figure>
        ) : (
          <p className={styles.empty}>표시할 페이지가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
