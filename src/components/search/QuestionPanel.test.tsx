import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QuestionPanel } from "./QuestionPanel";
import { demoSession } from "../../data/demoSession";

const memories = demoSession.memories;

function ask(question: string) {
  fireEvent.change(screen.getByLabelText("질문"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
}

function finishSearch() {
  act(() => {
    vi.runAllTimers();
  });
}

describe("QuestionPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("검색 중 상태를 먼저 보여준다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("시험에 나온다고 한 부분이 뭐야?");
    expect(screen.getByText(/근거를 찾는 중/)).toBeInTheDocument();

    finishSearch();
    expect(screen.queryByText(/근거를 찾는 중/)).not.toBeInTheDocument();
  });

  it("질문과 답변이 대화로 쌓인다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("시험에 나온다고 한 부분이 뭐야?");
    finishSearch();
    ask("과제는 언제까지야?");
    finishSearch();

    // 앞선 질문과 답변이 지워지지 않는다
    expect(screen.getByText("시험에 나온다고 한 부분이 뭐야?")).toBeInTheDocument();
    expect(screen.getByText("과제는 언제까지야?")).toBeInTheDocument();
    expect(screen.getAllByText(/PDF \d+페이지 장면이며/)).toHaveLength(2);
  });

  it("질문을 보내면 입력칸이 비워진다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("시험에 나온다고 한 부분이 뭐야?");
    expect(screen.getByLabelText("질문")).toHaveValue("");
  });

  it("시험 질문에 시험 Memory Unit 답변과 근거를 보여준다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("시험에 나온다고 한 부분이 뭐야?");
    finishSearch();

    expect(screen.getByText(/시험에서 언급된 부분입니다\./)).toBeInTheDocument();
    expect(screen.getByText("18:32 · PDF 12페이지")).toBeInTheDocument();
    expect(screen.getByText(/이 부분은 시험에 나옵니다\./)).toBeInTheDocument();
  });

  it("과제 질문에 과제 근거를 보여준다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("과제는 언제까지야?");
    finishSearch();

    expect(screen.getByText("23:10 · PDF 15페이지")).toBeInTheDocument();
  });

  it("핵심 개념 질문에 핵심 근거를 보여준다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("핵심 개념이 뭐야?");
    finishSearch();

    expect(screen.getByText("12:05 · PDF 10페이지")).toBeInTheDocument();
  });

  it("관련 없는 질문에는 근거 없음 메시지를 보여준다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("오늘 점심 뭐 먹지?");
    finishSearch();

    expect(screen.getByText("관련 근거를 찾지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByText(/PDF/)).not.toBeInTheDocument();
  });

  it("빈 질문은 검색하지 않는다", () => {
    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);

    ask("   ");
    expect(screen.queryByText(/근거를 찾는 중/)).not.toBeInTheDocument();
  });

  it("근거 카드를 선택하면 Memory Unit을 전달한다", () => {
    const onSelectEvidence = vi.fn();
    render(
      <QuestionPanel memories={memories} onSelectEvidence={onSelectEvidence} />,
    );

    ask("시험에 나온다고 한 부분이 뭐야?");
    finishSearch();

    fireEvent.click(screen.getByText("18:32 · PDF 12페이지"));

    expect(onSelectEvidence).toHaveBeenCalledTimes(1);
    expect(onSelectEvidence.mock.calls[0][0].importance).toBe("exam");
  });
});

describe("QuestionPanel · OpenAI 연결", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function connectAndAsk(question: string) {
    fireEvent.change(screen.getByLabelText("API 키"), {
      target: { value: "sk-test" },
    });
    ask(question);
  }

  it("키를 넣으면 GPT 답변과 GPT가 고른 근거를 보여준다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "18:32에 PDF 12페이지를 보며 시험 범위를 언급했습니다.",
                memoryId: "memory-003",
              }),
            },
          },
        ],
      }),
    } as Response);

    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);
    connectAndAsk("시험 얘기 정리해줘");

    expect(await screen.findByText(/시험 범위를 언급했습니다/)).toBeInTheDocument();
    expect(screen.getByText("18:32 · PDF 12페이지")).toBeInTheDocument();
  });

  it("OpenAI 호출이 실패하면 로컬 검색 결과로 되돌아간다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    } as Response);

    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);
    connectAndAsk("시험에 나온다고 한 부분이 뭐야?");

    expect(await screen.findByText(/401/)).toBeInTheDocument();
    expect(screen.getByText(/시험에서 언급된 부분입니다\./)).toBeInTheDocument();
    expect(screen.getByText("18:32 · PDF 12페이지")).toBeInTheDocument();
  });

  it("키가 없으면 OpenAI를 호출하지 않는다", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    vi.useFakeTimers();

    render(<QuestionPanel memories={memories} onSelectEvidence={() => {}} />);
    ask("시험에 나온다고 한 부분이 뭐야?");
    finishSearch();

    expect(fetchMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
