import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import App from "./App";

function attach(label: string, name: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(label)), {
    target: { files: [new File(["x"], name)] },
  });
}

describe("업로드 → 처리 → 작업 공간 흐름", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, "", "/");
  });

  it("flow=full이 없으면 지금까지처럼 작업 공간이 바로 열린다", () => {
    window.history.replaceState({}, "", "/?demo=example");
    render(<App />);

    expect(screen.getByLabelText("문서 장면")).toBeInTheDocument();
    expect(screen.queryByText("강의 자료를 올려주세요")).not.toBeInTheDocument();
  });

  it("flow=full이면 업로드 화면부터 시작해 처리를 거쳐 작업 공간으로 간다", () => {
    window.history.replaceState({}, "", "/?demo=example&flow=full&processing=1000");
    render(<App />);

    expect(screen.getByText("강의 자료를 올려주세요")).toBeInTheDocument();

    attach("강의 영상", "lecture.mp4");
    attach("강의 자료", "slides.pdf");
    attach("녹음 파일", "audio.m4a");
    fireEvent.click(screen.getByRole("button", { name: "노트 만들기" }));

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByLabelText("문서 장면")).toBeInTheDocument();
    expect(screen.getByLabelText("강의 영상 플레이어")).toBeInTheDocument();
  });

  it("phase로 중간 단계부터 열 수 있다", () => {
    window.history.replaceState({}, "", "/?demo=example&flow=full&phase=processing");
    render(<App />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
