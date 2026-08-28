import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import App from "./App";
import { demoSession } from "./data/demoSession";
import { exampleSession } from "./data/exampleSession";
import { timestampToSeconds } from "./lib/playback";

const EVIDENCE_CARD = /선택하면 해당 장면으로 이동합니다/;

function ask(question: string) {
  fireEvent.change(screen.getByLabelText("질문"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  act(() => {
    vi.runAllTimers();
  });
}

describe("App 통합 흐름", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, "", "/");
  });

  it("최초 실행 시 데모 세션과 첫 페이지를 보여준다", () => {
    render(<App />);

    expect(screen.getByText(demoSession.title)).toBeInTheDocument();
    expect(screen.getByText(`${demoSession.memories.length}개`)).toBeInTheDocument();
    expect(screen.getByAltText(/PDF 10페이지/)).toBeInTheDocument();
    // 아직 선택된 발언이 없으므로 근거 강조도 없다
    expect(screen.queryByText("근거 페이지")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { current: true })).not.toBeInTheDocument();
  });

  it("시험 질문 → 근거 카드 선택 → 12페이지와 00:18:32 발언이 동시에 강조된다", () => {
    render(<App />);

    ask("시험에 나온다고 한 부분이 뭐야?");

    const evidence = screen.getByRole("button", { name: EVIDENCE_CARD });
    expect(evidence).toHaveTextContent("18:32 · PDF 12페이지");

    fireEvent.click(evidence);

    expect(screen.getByAltText(/PDF 12페이지/)).toBeInTheDocument();
    expect(screen.getByText("근거 페이지")).toBeInTheDocument();

    const selected = screen.getByRole("button", { current: true });
    expect(selected).toHaveTextContent("00:18:32");
    expect(selected).toHaveTextContent("이 부분은 시험에 나옵니다.");
  });

  it("타임라인에서 발언을 고르면 해당 페이지로 함께 이동한다", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /00:23:10/ }));

    expect(screen.getByAltText(/PDF 15페이지/)).toBeInTheDocument();
    expect(screen.getByText("근거 페이지")).toBeInTheDocument();
  });

  it("문서 이동 버튼은 현재 페이지만 바꾸고 선택된 발언은 유지한다", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /00:18:32/ }));
    expect(screen.getByAltText(/PDF 12페이지/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));

    expect(screen.getByAltText(/PDF 15페이지/)).toBeInTheDocument();
    // 선택된 발언은 그대로, 다른 페이지이므로 근거 강조만 사라진다
    expect(screen.getByRole("button", { current: true })).toHaveTextContent("00:18:32");
    expect(screen.queryByText("근거 페이지")).not.toBeInTheDocument();
  });

  it("관련 없는 질문은 근거 없음을 알리고 기존 화면 상태를 유지한다", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /00:23:10/ }));
    ask("오늘 점심 메뉴가 뭐야?");

    expect(screen.getByText("관련 근거를 찾지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: EVIDENCE_CARD })).not.toBeInTheDocument();
    expect(screen.getByAltText(/PDF 15페이지/)).toBeInTheDocument();
    expect(screen.getByRole("button", { current: true })).toHaveTextContent("00:23:10");
  });

  it("과제·핵심 질문도 각각의 Memory Unit을 근거로 돌려준다", () => {
    render(<App />);

    // 대화가 쌓이므로 마지막 근거 카드가 방금 물어본 질문의 답이다
    const lastEvidence = () =>
      screen.getAllByRole("button", { name: EVIDENCE_CARD }).at(-1) as HTMLElement;

    ask("과제는 언제까지야?");
    expect(lastEvidence()).toHaveTextContent("23:10 · PDF 15페이지");

    ask("핵심 개념이 뭐야?");
    expect(lastEvidence()).toHaveTextContent("12:05 · PDF 10페이지");
  });

  it("example 모드에서는 실제 강의 fixture를 불러온다", () => {
    window.history.replaceState({}, "", "/?demo=example");
    render(<App />);

    expect(
      screen.getByText("ML Basics · Model, Loss Function, Optimizer"),
    ).toBeInTheDocument();
    const firstPage = exampleSession.pages[0].pageNumber;
    expect(
      screen.getByAltText(new RegExp(`PDF ${firstPage}페이지`)),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("강의 영상 플레이어")).toHaveAttribute(
      "src",
      "/data/lecture.mp4",
    );
  });

  it("같은 발언을 다시 선택해도 영상이 그 시각으로 다시 이동한다", () => {
    window.history.replaceState({}, "", "/?demo=example");
    render(<App />);

    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    const { timestamp } = exampleSession.memories[0];
    const seconds = timestampToSeconds(timestamp);
    const firstMemory = screen.getAllByText(timestamp)[0];

    fireEvent.click(firstMemory);
    expect(video.currentTime).toBe(seconds);

    // 사용자가 영상을 직접 옮긴 뒤 같은 발언을 다시 선택하는 상황
    video.currentTime = seconds + 260;
    fireEvent.click(firstMemory);
    expect(video.currentTime).toBe(seconds);
  });
});
