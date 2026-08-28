import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import App from "./App";
import { exampleSession } from "./data/exampleSession";
import { segmentAtSecond, timestampToSeconds } from "./lib/playback";

const segments = exampleSession.segments ?? [];

function currentPageNumber(): number {
  const label = screen.getByLabelText("문서 장면").textContent ?? "";
  return Number(/PDF (\d+)페이지/.exec(label)?.[1]);
}

function moveTo(video: HTMLVideoElement, seconds: number) {
  video.currentTime = seconds;
  fireEvent.timeUpdate(video);
}

/** 지정한 구간과 다른 페이지를 쓰는 뒤쪽 구간 */
function laterSegmentAfter(index: number) {
  const from = segments[index];
  return segments.slice(index + 1).find((segment) => segment.pageNumber !== from.pageNumber);
}

describe("재생 중 문서 자동 추종", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/?demo=example");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("재생 중에는 지금 화면에 떠 있던 슬라이드를 따라간다", () => {
    render(<App />);
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    const target = segments[4];

    fireEvent.play(video);
    moveTo(video, target.start + 1);

    expect(currentPageNumber()).toBe(target.pageNumber);
  });

  it("멈춰 있을 때는 따라가지 않는다", () => {
    render(<App />);
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    const before = currentPageNumber();

    moveTo(video, segments[4].start + 1);

    expect(currentPageNumber()).toBe(before);
  });

  it("발언을 선택한 직후의 timeupdate는 그 선택을 덮어쓰지 않는다", () => {
    render(<App />);
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    fireEvent.play(video);

    const memory = exampleSession.memories.find((item) => item.slideIndex === 6);
    if (!memory) throw new Error("테스트용 발언을 찾지 못했습니다");
    const seconds = timestampToSeconds(memory.timestamp);

    fireEvent.click(screen.getAllByText(memory.timestamp)[0]);
    expect(currentPageNumber()).toBe(memory.pageNumber);

    // 이동 요청 지점에서 발생하는 timeupdate
    moveTo(video, seconds);
    expect(currentPageNumber()).toBe(memory.pageNumber);
  });

  it("이동 지점을 충분히 지나가면 다시 따라간다", () => {
    render(<App />);
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    fireEvent.play(video);

    const memory = exampleSession.memories.find((item) => item.slideIndex === 6);
    if (!memory) throw new Error("테스트용 발언을 찾지 못했습니다");
    const later = laterSegmentAfter(memory.slideIndex ?? 0);
    if (!later) throw new Error("테스트용 뒤쪽 구간을 찾지 못했습니다");

    fireEvent.click(screen.getAllByText(memory.timestamp)[0]);
    moveTo(video, later.start + 1);

    expect(currentPageNumber()).toBe(later.pageNumber);
    expect(segmentAtSecond(segments, later.start + 1)?.pageNumber).toBe(later.pageNumber);
  });

  it("사용자가 페이지를 직접 넘기면 자동 추종을 멈춘다", () => {
    render(<App />);
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    fireEvent.play(video);

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    const manual = currentPageNumber();

    moveTo(video, segments[8].start + 1);

    expect(currentPageNumber()).toBe(manual);
  });
});
