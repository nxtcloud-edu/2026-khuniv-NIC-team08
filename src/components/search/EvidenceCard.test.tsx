import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EvidenceCard } from "./EvidenceCard";
import type { MemoryUnit } from "../../types/session";

const examMemory: MemoryUnit = {
  id: "memory-003",
  timestamp: "00:18:32",
  pageNumber: 12,
  transcript: "이 부분은 시험에 나옵니다.",
  summary: "교수님이 12페이지 오른쪽 구조도를 시험 출제 범위로 지목해 언급함",
  importance: "exam",
  keywords: ["시험", "출제"],
};

describe("EvidenceCard", () => {
  it("시각, 페이지, 발언 원문, 요약, 중요도 배지를 표시한다", () => {
    render(<EvidenceCard memory={examMemory} onSelect={() => {}} />);

    expect(screen.getByText("18:32 · PDF 12페이지")).toBeInTheDocument();
    expect(screen.getByText(/이 부분은 시험에 나옵니다\./)).toBeInTheDocument();
    expect(screen.getByText(examMemory.summary)).toBeInTheDocument();
    expect(screen.getByText("시험")).toBeInTheDocument();
  });

  it("선택하면 Memory Unit 전체를 전달한다", () => {
    const onSelect = vi.fn();
    render(<EvidenceCard memory={examMemory} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(examMemory);
  });

  it("중요도에 따라 배지 라벨이 달라진다", () => {
    render(
      <EvidenceCard
        memory={{ ...examMemory, importance: "assignment" }}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("과제")).toBeInTheDocument();
  });
});
