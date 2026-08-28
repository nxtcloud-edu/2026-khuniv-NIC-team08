import { useRef, useState } from "react";

import { HeaderStatus } from "./components/workspace/HeaderStatus";
import { DocumentViewer } from "./components/workspace/DocumentViewer";
import { Timeline } from "./components/workspace/Timeline";
import { LecturePlayer } from "./components/workspace/LecturePlayer";
import { QuestionPanel } from "./components/search/QuestionPanel";
import { UploadScreen } from "./components/upload/UploadScreen";
import { ProcessingScreen } from "./components/processing/ProcessingScreen";
import { demoSession } from "./data/demoSession";
import { exampleSession } from "./data/exampleSession";
import { memoryAtSecond, segmentAtSecond, timestampToSeconds } from "./lib/playback";
import type { MemoryUnit } from "./types/session";
import "./styles/app.css";

type Phase = "upload" | "processing" | "workspace";

// 재생 헤드가 방금 이동한 지점을 이만큼 지나가야 자동 추종을 재개한다
const SEEK_SETTLE_SECONDS = 2;

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get("demo") === "example" ? exampleSession : demoSession;
  const { title, duration, pages, memories, videoPath, segments } = session;

  // 업로드·처리 화면은 ?flow=full 일 때만 거친다. 시연 중 문제가 생기면 주소에서 빼면 된다.
  const fullFlow = params.get("flow") === "full" && Boolean(session.pipeline);
  const processingMs = Number(params.get("processing")) || 12000;

  // 리허설용: ?phase=processing 처럼 중간 단계부터 바로 열 수 있다
  const startPhase = params.get("phase") as Phase | null;
  const [phase, setPhase] = useState<Phase>(
    fullFlow ? (startPhase ?? "upload") : "workspace",
  );
  const [currentPage, setCurrentPage] = useState(pages[0]?.pageNumber ?? 0);
  const [selectedMemory, setSelectedMemory] = useState<MemoryUnit | undefined>();
  // 매번 새 객체를 만들어 같은 발언을 다시 선택해도 영상이 다시 이동하게 한다
  const [seekRequest, setSeekRequest] = useState<{ seconds: number } | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  // 사용자가 직접 페이지를 넘기면 자동 추종을 잠시 끈다
  const [followsPlayhead, setFollowsPlayhead] = useState(true);
  // 방금 요청한 이동 지점. 이 근처의 timeupdate는 선택을 덮어쓰지 않는다.
  const pendingSeekRef = useRef<number | null>(null);

  // 타임라인 항목과 근거 카드는 같은 동작을 한다: 발언을 선택하고 그 장면으로 이동
  const selectMemory = (memory: MemoryUnit) => {
    const seconds = timestampToSeconds(memory.timestamp);
    setSelectedMemory(memory);
    setCurrentPage(memory.pageNumber);
    setSeekRequest({ seconds });
    pendingSeekRef.current = seconds;
    setFollowsPlayhead(true);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setFollowsPlayhead(false);
  };

  const handlePlayingChange = (playing: boolean) => {
    setIsPlaying(playing);
    if (playing) setFollowsPlayhead(true);
  };

  /** 재생 중에는 지금 화면에 떠 있던 슬라이드를 따라간다. 선택된 발언은 건드리지 않는다. */
  const handleTimeUpdate = (seconds: number) => {
    setPlayheadSeconds(seconds);

    const pending = pendingSeekRef.current;
    if (pending !== null) {
      if (Math.abs(seconds - pending) <= SEEK_SETTLE_SECONDS) return;
      pendingSeekRef.current = null;
    }

    if (!isPlaying || !followsPlayhead || !segments) return;
    const segment = segmentAtSecond(segments, seconds);
    if (segment) setCurrentPage(segment.pageNumber);
  };

  const finishProcessing = () => {
    if (fullFlow) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("flow");
      nextParams.delete("phase");
      nextParams.delete("processing");
      const nextSearch = nextParams.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
      );
    }
    setPhase("workspace");
  };

  if (phase === "upload") {
    return <UploadScreen onStart={() => setPhase("processing")} />;
  }

  if (phase === "processing") {
    return (
      <ProcessingScreen
        session={session}
        durationMs={processingMs}
        onDone={finishProcessing}
      />
    );
  }

  const playheadMemoryId =
    isPlaying && segments ? memoryAtSecond(memories, playheadSeconds)?.id : undefined;

  return (
    <div className="appShell">
      <HeaderStatus
        title={title}
        duration={duration}
        memoryCount={memories.length}
        pipeline={session.pipeline}
      />

      <div className="appBody">
        <div className="appWorkspace">
          <div className={`appPrimaryRow ${videoPath ? "" : "appPrimaryRowWithoutVideo"}`}>
            {videoPath ? (
              <LecturePlayer
                src={videoPath}
                seek={seekRequest}
                onTimeUpdate={handleTimeUpdate}
                onPlayingChange={handlePlayingChange}
              />
            ) : null}
            <DocumentViewer
              pages={pages}
              currentPage={currentPage}
              highlightedPage={selectedMemory?.pageNumber}
              onPageChange={handlePageChange}
            />
          </div>
          <Timeline
            memories={memories}
            selectedMemoryId={selectedMemory?.id}
            playheadMemoryId={playheadMemoryId}
            onSelect={selectMemory}
          />
        </div>

        <QuestionPanel memories={memories} onSelectEvidence={selectMemory} />
      </div>
    </div>
  );
}
