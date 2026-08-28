import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LecturePlayer } from "./LecturePlayer";

describe("LecturePlayer", () => {
  it("로컬 강의 영상을 표시한다", () => {
    render(<LecturePlayer src="/example/lecture.mp4" />);

    expect(screen.getByLabelText("강의 영상 플레이어")).toHaveAttribute(
      "src",
      "/example/lecture.mp4",
    );
  });

  it("선택된 발언의 시각으로 이동한다", () => {
    const { rerender } = render(
      <LecturePlayer src="/example/lecture.mp4" seekTo={40} />,
    );
    const video = screen.getByLabelText("강의 영상 플레이어") as HTMLVideoElement;
    expect(video.currentTime).toBe(40);

    rerender(<LecturePlayer src="/example/lecture.mp4" seekTo={535} />);
    expect(video.currentTime).toBe(535);
  });
});
