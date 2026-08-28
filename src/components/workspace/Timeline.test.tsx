import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { MemoryUnit } from "../../types/session";
import { Timeline } from "./Timeline";

const memories: MemoryUnit[] = [
  {
    id: "memory-key",
    timestamp: "00:12:05",
    pageNumber: 10,
    transcript: "준비 상태와 대기 상태를 구분하는 것이 핵심입니다.",
    summary: "핵심 개념 설명",
    importance: "key",
    keywords: ["핵심", "개념", "상태"],
  },
  {
    id: "memory-exam",
    timestamp: "00:18:32",
    pageNumber: 12,
    transcript: "이 부분은 시험에 나옵니다.",
    summary: "시험 출제 부분 지목",
    importance: "exam",
    keywords: ["시험", "출제", "나온다"],
  },
  {
    id: "memory-assignment",
    timestamp: "00:23:10",
    pageNumber: 15,
    transcript: "과제는 다음 주 금요일까지 제출하세요.",
    summary: "과제 제출 기한 안내",
    importance: "assignment",
    keywords: ["과제", "제출", "마감"],
  },
  {
    id: "memory-normal",
    timestamp: "00:30:00",
    pageNumber: 15,
    transcript: "질문 있으면 지금 해주세요.",
    summary: "질의 안내",
    importance: "normal",
    keywords: ["질문", "안내", "정리"],
  },
];

describe("Timeline", () => {
  it("발언마다 시각, 원문, 페이지 번호를 표시한다", () => {
    render(<Timeline memories={memories} onSelect={vi.fn()} />);

    expect(screen.getByText("00:18:32")).toBeInTheDocument();
    expect(screen.getByText("이 부분은 시험에 나옵니다.")).toBeInTheDocument();
    expect(screen.getByText("PDF 12페이지")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(memories.length);
  });

  it("중요도마다 구분되는 배지 라벨을 표시한다", () => {
    render(<Timeline memories={memories} onSelect={vi.fn()} />);

    for (const label of ["시험", "과제", "핵심", "일반"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("항목을 클릭하면 Memory Unit 전체를 전달한다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Timeline memories={memories} onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: /이 부분은 시험에 나옵니다./ }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(memories[1]);
  });

  it("키보드로 항목을 선택할 수 있다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Timeline memories={memories} onSelect={onSelect} />);

    await user.tab();
    await user.tab();
    expect(
      screen.getByRole("button", { name: /이 부분은 시험에 나옵니다./ }),
    ).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(memories[1]);
  });

  it("selectedMemoryId에 해당하는 항목만 선택 상태로 표시한다", () => {
    render(
      <Timeline
        memories={memories}
        selectedMemoryId="memory-exam"
        onSelect={vi.fn()}
      />,
    );

    const selected = screen.getAllByRole("button").filter(
      (button) => button.getAttribute("aria-current") === "true",
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("이 부분은 시험에 나옵니다.");
  });

  it("선택된 항목이 없으면 아무 항목도 강조하지 않는다", () => {
    render(<Timeline memories={memories} onSelect={vi.fn()} />);

    expect(
      screen.queryByRole("button", { current: true }),
    ).not.toBeInTheDocument();
  });

  it("발언이 없으면 안내 문구를 표시한다", () => {
    render(<Timeline memories={[]} onSelect={vi.fn()} />);

    expect(screen.getByText("표시할 발언이 없습니다.")).toBeInTheDocument();
  });
});
