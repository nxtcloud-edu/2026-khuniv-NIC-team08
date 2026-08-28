import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { ProcessingScreen } from "./ProcessingScreen";
import type { DemoSession } from "../../types/session";

const session: DemoSession = {
  id: "s",
  title: "테스트 강의",
  duration: "00:52:52",
  videoPath: "/data/lecture.mp4",
  pages: [{ pageNumber: 1, imagePath: "/p1.jpg", title: "첫 장" }],
  memories: [],
};

describe("ProcessingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("아이콘과 진행 바를 보여주고 진행이 끝나면 onDone을 부른다", () => {
    const onDone = vi.fn();
    render(<ProcessingScreen session={session} durationMs={1000} onDone={onDone} />);

    expect(screen.getByLabelText("노트 변환 중")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"))).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("바로 열기를 누르면 즉시 끝난다", () => {
    const onDone = vi.fn();
    render(<ProcessingScreen session={session} durationMs={60000} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "바로 열기" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("durationMs가 0이면 화면을 거치지 않는다", () => {
    const onDone = vi.fn();
    render(<ProcessingScreen session={session} durationMs={0} onDone={onDone} />);
    expect(onDone).toHaveBeenCalled();
  });
});
