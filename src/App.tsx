import { useState } from "react";

import { HeaderStatus } from "./components/workspace/HeaderStatus";
import { DocumentViewer } from "./components/workspace/DocumentViewer";
import { Timeline } from "./components/workspace/Timeline";
import { LecturePlayer } from "./components/workspace/LecturePlayer";
import { QuestionPanel } from "./components/search/QuestionPanel";
import { demoSession } from "./data/demoSession";
import { exampleSession } from "./data/exampleSession";
import type { MemoryUnit } from "./types/session";
import "./styles/app.css";

function timestampToSeconds(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export default function App() {
  const session = new URLSearchParams(window.location.search).get("demo") === "example"
    ? exampleSession
    : demoSession;
  const { title, duration, pages, memories, videoPath } = session;

  const [currentPage, setCurrentPage] = useState(pages[0]?.pageNumber ?? 0);
  const [selectedMemory, setSelectedMemory] = useState<MemoryUnit | undefined>();
  // 매번 새 객체를 만들어 같은 발언을 다시 선택해도 영상이 다시 이동하게 한다
  const [seekRequest, setSeekRequest] = useState<{ seconds: number } | undefined>();

  // 타임라인 항목과 근거 카드는 같은 동작을 한다: 발언을 선택하고 그 장면으로 이동
  const selectMemory = (memory: MemoryUnit) => {
    setSelectedMemory(memory);
    setCurrentPage(memory.pageNumber);
    setSeekRequest({ seconds: timestampToSeconds(memory.timestamp) });
  };

  return (
    <div className="appShell">
      <HeaderStatus
        title={title}
        duration={duration}
        memoryCount={memories.length}
      />

      <div className="appBody">
        <div className="appWorkspace">
          <DocumentViewer
            pages={pages}
            currentPage={currentPage}
            highlightedPage={selectedMemory?.pageNumber}
            onPageChange={setCurrentPage}
          />
          {videoPath ? (
            <div className="appSideColumn">
              <LecturePlayer src={videoPath} seek={seekRequest} />
              <Timeline
                memories={memories}
                selectedMemoryId={selectedMemory?.id}
                onSelect={selectMemory}
              />
            </div>
          ) : (
            <Timeline
              memories={memories}
              selectedMemoryId={selectedMemory?.id}
              onSelect={selectMemory}
            />
          )}
        </div>

        <QuestionPanel memories={memories} onSelectEvidence={selectMemory} />
      </div>
    </div>
  );
}
