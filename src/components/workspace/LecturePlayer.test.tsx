import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LecturePlayer } from "./LecturePlayer";

describe("LecturePlayer", () => {
  it("로컬 강의 영상을 표시한다", () => {
    render(<LecturePlayer src="/data/lecture.mp4" />);

    expect(screen.getByLabelText("강의 영상 플레이어")).toHaveAttribute(
      "src",
      "/data/lecture.mp4",
    );
  });

  it("선택된 발언의 시각으로 이동한다", () => {
    const { rerender } = render(
      <LecturePlayer src="/data/lecture.mp4" seek={{ seconds: 40 }} />,
    );
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    expect(video.currentTime).toBe(40);

    rerender(<LecturePlayer src="/data/lecture.mp4" seek={{ seconds: 535 }} />);
    expect(video.currentTime).toBe(535);
  });

  it("같은 시각을 다시 요청해도 다시 이동한다", () => {
    const { rerender } = render(
      <LecturePlayer src="/data/lecture.mp4" seek={{ seconds: 40 }} />,
    );
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;

    video.currentTime = 300;
    rerender(<LecturePlayer src="/data/lecture.mp4" seek={{ seconds: 40 }} />);

    expect(video.currentTime).toBe(40);
  });
});
