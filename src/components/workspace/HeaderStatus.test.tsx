import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeaderStatus } from "./HeaderStatus";

describe("HeaderStatus", () => {
  it("세션 이름, 길이, Memory Unit 개수를 표시한다", () => {
    render(
      <HeaderStatus
        title="운영체제 5주차 · 프로세스와 컨텍스트 스위치"
        duration="00:45:00"
        memoryCount={4}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "운영체제 5주차 · 프로세스와 컨텍스트 스위치",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("00:45:00")).toBeInTheDocument();
    expect(screen.getByText("4개")).toBeInTheDocument();
  });

  it("사전 처리된 데모임을 알리는 문구를 표시한다", () => {
    render(<HeaderStatus title="세션" duration="00:45:00" memoryCount={4} />);

    expect(screen.getByText(/On-device concept demo/)).toBeInTheDocument();
  });
});
