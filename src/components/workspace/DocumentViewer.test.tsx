import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DocumentPage } from "../../types/session";
import { DocumentViewer } from "./DocumentViewer";

/** 페이지 번호가 연속적이지 않은 실제 데모 데이터와 같은 형태 */
const pages: DocumentPage[] = [
  { pageNumber: 10, imagePath: "/demo/pages/page-10.png", title: "프로세스 상태 전이" },
  { pageNumber: 12, imagePath: "/demo/pages/page-12.png", title: "컨텍스트 스위치" },
  { pageNumber: 15, imagePath: "/demo/pages/page-15.png", title: "과제 안내" },
];

function prevButton() {
  return screen.getByRole("button", { name: "이전 페이지" });
}

function nextButton() {
  return screen.getByRole("button", { name: "다음 페이지" });
}

describe("DocumentViewer", () => {
  it("현재 페이지 번호, 제목, 이미지를 표시한다", () => {
    render(
      <DocumentViewer pages={pages} currentPage={12} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText("PDF 12페이지")).toBeInTheDocument();
    expect(screen.getByText("컨텍스트 스위치")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/demo/pages/page-12.png",
    );
  });

  it("첫 페이지에서는 이전 버튼이, 마지막 페이지에서는 다음 버튼이 비활성화된다", () => {
    const { unmount } = render(
      <DocumentViewer pages={pages} currentPage={10} onPageChange={vi.fn()} />,
    );
    expect(prevButton()).toBeDisabled();
    expect(nextButton()).toBeEnabled();
    unmount();

    render(
      <DocumentViewer pages={pages} currentPage={15} onPageChange={vi.fn()} />,
    );
    expect(prevButton()).toBeEnabled();
    expect(nextButton()).toBeDisabled();
  });

  it("이동 버튼은 배열 순서상 다음·이전 페이지 번호를 전달한다", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DocumentViewer
        pages={pages}
        currentPage={12}
        onPageChange={onPageChange}
      />,
    );

    await user.click(nextButton());
    expect(onPageChange).toHaveBeenLastCalledWith(15);

    await user.click(prevButton());
    expect(onPageChange).toHaveBeenLastCalledWith(10);
  });

  it("키보드로 페이지를 이동할 수 있다", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DocumentViewer
        pages={pages}
        currentPage={10}
        onPageChange={onPageChange}
      />,
    );

    // 첫 페이지에서 이전 버튼은 비활성이므로 다음 버튼이 첫 탭 대상이다.
    await user.tab();
    expect(nextButton()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(12);
  });

  it("highlightedPage가 현재 페이지와 같을 때만 근거 강조를 표시한다", () => {
    const { unmount } = render(
      <DocumentViewer
        pages={pages}
        currentPage={12}
        highlightedPage={12}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("근거 페이지")).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
    unmount();

    render(
      <DocumentViewer
        pages={pages}
        currentPage={10}
        highlightedPage={12}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("근거 페이지")).not.toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveAttribute(
      "data-highlighted",
      "false",
    );
  });

  it("존재하지 않는 페이지 번호에는 안내 문구를 표시하고 이동을 막는다", () => {
    render(
      <DocumentViewer pages={pages} currentPage={99} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText("표시할 페이지가 없습니다.")).toBeInTheDocument();
    expect(prevButton()).toBeDisabled();
    expect(nextButton()).toBeDisabled();
  });
});
