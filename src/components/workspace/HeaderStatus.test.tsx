import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HeaderStatus } from "./HeaderStatus";

describe("HeaderStatus", () => {
  it("세션 이름, 길이, Memory Unit 개수를 표시한다", () => {
    render(
      <HeaderStatus
        title="운영체제 5주차 · 프로세스와 컨텍스트 스위치"
        duration="00:45:00"
        memoryCount={4}
        onRestart={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Topic : 운영체제 5주차 · 프로세스와 컨텍스트 스위치",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("00:45:00")).toBeInTheDocument();
    expect(screen.getByText("4개")).toBeInTheDocument();
  });

  it("사전 처리된 데모임을 알리는 문구를 표시한다", () => {
    render(
      <HeaderStatus title="세션" duration="00:45:00" memoryCount={4} onRestart={vi.fn()} />,
    );

    expect(screen.getByText(/On-device concept demo/)).toBeInTheDocument();
  });

  it("AnythingNote 브랜드를 누르면 자료 입력 화면으로 돌아간다", () => {
    const onRestart = vi.fn();
    render(
      <HeaderStatus title="세션" duration="00:45:00" memoryCount={4} onRestart={onRestart} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "AnythingNote — 자료 입력 화면으로 돌아가기" }),
    );

    expect(onRestart).toHaveBeenCalledOnce();
  });
});
