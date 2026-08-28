import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { UploadScreen } from "./UploadScreen";

function file(name: string, type: string, size = 1024) {
  const created = new File(["x"], name, { type });
  Object.defineProperty(created, "size", { value: size });
  return created;
}

function put(label: string, dropped: File) {
  fireEvent.change(screen.getByLabelText(new RegExp(label)), {
    target: { files: [dropped] },
  });
}

describe("UploadScreen", () => {
  it("세 슬롯이 모두 차기 전에는 시작할 수 없다", () => {
    render(<UploadScreen onStart={vi.fn()} />);
    const start = screen.getByRole("button", { name: "노트 만들기" });

    expect(start).toBeDisabled();

    put("강의 영상", file("lecture.mp4", "video/mp4"));
    put("강의 자료", file("slides.pdf", "application/pdf"));
    expect(start).toBeDisabled();

    put("녹음 파일", file("audio.m4a", "audio/mp4"));
    expect(start).toBeEnabled();
  });

  it("넣은 파일의 이름과 크기를 보여준다", () => {
    render(<UploadScreen onStart={vi.fn()} />);
    put("강의 영상", file("lecture.mp4", "video/mp4", 24_634_751));

    expect(screen.getByText("lecture.mp4")).toBeInTheDocument();
    expect(screen.getByText("23 MB")).toBeInTheDocument();
  });

  it("시작하면 넣은 파일을 그대로 넘긴다", () => {
    const onStart = vi.fn();
    render(<UploadScreen onStart={onStart} />);

    const video = file("lecture.mp4", "video/mp4");
    put("강의 영상", video);
    put("강의 자료", file("slides.pdf", "application/pdf"));
    put("녹음 파일", file("audio.m4a", "audio/mp4"));
    fireEvent.click(screen.getByRole("button", { name: "노트 만들기" }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0].video).toBe(video);
  });

  it("끌어다 놓아도 파일이 들어간다", () => {
    render(<UploadScreen onStart={vi.fn()} />);
    const dropped = file("lecture.mp4", "video/mp4");

    fireEvent.drop(screen.getByText("강의 영상").closest("div") as HTMLElement, {
      dataTransfer: { files: [dropped] },
    });

    expect(screen.getByText("lecture.mp4")).toBeInTheDocument();
  });
});
