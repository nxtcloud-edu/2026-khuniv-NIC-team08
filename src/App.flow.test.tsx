import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import App from "./App";

function attach(name: string) {
  fireEvent.change(screen.getByLabelText("자료 첨부"), {
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
    expect(screen.queryByText("무엇이든, 기억으로 만들어 보세요")).not.toBeInTheDocument();
  });

  it("flow=full이면 업로드 화면부터 시작해 처리를 거쳐 작업 공간으로 간다", () => {
    window.history.replaceState({}, "", "/?demo=example&flow=full&processing=1000");
    render(<App />);

    expect(screen.getByText("무엇이든, 기억으로 만들어 보세요")).toBeInTheDocument();

    attach("slides.pdf");
    fireEvent.change(screen.getByLabelText("프롬프트"), {
      target: { value: "핵심 개념 위주로 정리해 줘" },
    });
    fireEvent.click(screen.getByRole("button", { name: "노트 만들기" }));

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByLabelText("문서 장면")).toBeInTheDocument();
    expect(screen.getByLabelText("강의 영상 플레이어")).toBeInTheDocument();
    expect(window.location.search).toBe("?demo=example");
  });

  it("phase로 중간 단계부터 열 수 있다", () => {
    window.history.replaceState({}, "", "/?demo=example&flow=full&phase=processing");
    render(<App />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("상단 AnythingNote를 누르면 자료 입력 화면으로 돌아간다", () => {
    window.history.replaceState({}, "", "/?demo=example");
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "AnythingNote — 자료 입력 화면으로 돌아가기" }),
    );

    expect(screen.getByText("무엇이든, 기억으로 만들어 보세요")).toBeInTheDocument();
    expect(window.location.search).toBe("?demo=example&flow=full");
  });
});
