import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { UploadScreen } from "./UploadScreen";

function file(name: string, type: string) {
  return new File(["x"], name, { type, lastModified: 1 });
}

function attach(...files: File[]) {
  fireEvent.change(screen.getByLabelText("자료 첨부"), {
    target: { files },
  });
}

describe("UploadScreen", () => {
  it("자료를 첨부하기 전에는 시작할 수 없다", () => {
    render(<UploadScreen onStart={vi.fn()} />);

    expect(screen.getByRole("button", { name: "노트 만들기" })).toBeDisabled();

    attach(file("slides.pdf", "application/pdf"));
    expect(screen.getByRole("button", { name: "노트 만들기" })).toBeEnabled();
  });

  it("여러 자료를 한 입력 박스에 첨부하고 삭제할 수 있다", () => {
    render(<UploadScreen onStart={vi.fn()} />);
    attach(file("lecture.mp4", "video/mp4"), file("slides.pdf", "application/pdf"));

    expect(screen.getByText("lecture.mp4")).toBeInTheDocument();
    expect(screen.getByText("slides.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "lecture.mp4 삭제" }));
    expect(screen.queryByText("lecture.mp4")).not.toBeInTheDocument();
  });

  it("노트 만들기를 누르면 첨부 자료와 프롬프트를 넘긴다", () => {
    const onStart = vi.fn();
    const slides = file("slides.pdf", "application/pdf");
    render(<UploadScreen onStart={onStart} />);

    attach(slides);
    fireEvent.change(screen.getByLabelText("프롬프트"), {
      target: { value: "시험에 중요한 내용을 중심으로 정리해 줘" },
    });
    fireEvent.click(screen.getByRole("button", { name: "노트 만들기" }));

    expect(onStart).toHaveBeenCalledWith(
      [slides],
      "시험에 중요한 내용을 중심으로 정리해 줘",
    );
  });

  it("자료를 끌어다 놓아도 첨부된다", () => {
    render(<UploadScreen onStart={vi.fn()} />);
    const slides = file("slides.pdf", "application/pdf");

    fireEvent.drop(screen.getByRole("form"), {
      dataTransfer: { files: [slides] },
    });

    expect(screen.getByText("slides.pdf")).toBeInTheDocument();
  });
});
