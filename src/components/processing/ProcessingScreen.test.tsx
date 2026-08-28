import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { ProcessingScreen } from "./ProcessingScreen";
import type { DemoSession } from "../../types/session";

const session: DemoSession = {
  id: "s",
  title: "테스트 강의",
  duration: "00:52:52",
  videoPath: "/data/lecture.mp4",
  pages: [
    { pageNumber: 1, imagePath: "/p1.jpg", thumbnailPath: "/t1.jpg", title: "첫 장" },
    { pageNumber: 2, imagePath: "/p2.jpg", thumbnailPath: "/t2.jpg", title: "둘째 장" },
  ],
  memories: [],
  segments: [
    { index: 0, pageNumber: 1, start: 0, end: 10, thumbnailPath: "/f1.jpg", confidence: 0.99 },
    { index: 1, pageNumber: 2, start: 11, end: 28, thumbnailPath: "/f2.jpg", confidence: 0.98 },
  ],
  pipeline: {
    sampledFrames: 3173,
    sampleIntervalSeconds: 1,
    transcriptCues: 495,
    assignedCues: 492,
    slideSegments: 2,
    pdfPages: 68,
    matchedPages: 2,
    memoryUnits: 67,
    annotatedBy: "openai:gpt-4o-mini",
  },
};

describe("ProcessingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("진행이 끝나면 onDone을 부른다", () => {
    const onDone = vi.fn();
    render(<ProcessingScreen session={session} durationMs={1000} onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("단계 수치가 실제 파이프라인 값까지 올라간다", () => {
    render(<ProcessingScreen session={session} durationMs={1000} onDone={vi.fn()} />);

    // 시작 직후에는 네 단계 모두 0에서 출발한다
    expect(screen.getAllByText("0")).toHaveLength(4);

    // 마지막 눈금(80ms 간격)이 지나야 진행률이 1에 닿는다
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText("3,173")).toBeInTheDocument();
    expect(screen.getByText("495")).toBeInTheDocument();
    expect(screen.getByText("67")).toBeInTheDocument();
  });

  it("건너뛰기를 누르면 바로 끝난다", () => {
    const onDone = vi.fn();
    render(<ProcessingScreen session={session} durationMs={60000} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("durationMs가 0이면 화면을 거치지 않는다", () => {
    const onDone = vi.fn();
    render(<ProcessingScreen session={session} durationMs={0} onDone={onDone} />);
    expect(onDone).toHaveBeenCalled();
  });

  it("진행률을 progressbar로 알린다", () => {
    render(<ProcessingScreen session={session} durationMs={1000} onDone={vi.fn()} />);
    const bar = screen.getByRole("progressbar");

    expect(bar).toHaveAttribute("aria-valuenow", "0");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  });
});
