import { useState } from "react";

import { HeaderStatus } from "./components/workspace/HeaderStatus";
import { DocumentViewer } from "./components/workspace/DocumentViewer";
import { Timeline } from "./components/workspace/Timeline";
import { QuestionPanel } from "./components/search/QuestionPanel";
import { demoSession } from "./data/demoSession";
import type { MemoryUnit } from "./types/session";
import "./styles/app.css";

export default function App() {
  const { title, duration, pages, memories } = demoSession;

  const [currentPage, setCurrentPage] = useState(pages[0].pageNumber);
  const [selectedMemory, setSelectedMemory] = useState<MemoryUnit | undefined>();

  // 타임라인 항목과 근거 카드는 같은 동작을 한다: 발언을 선택하고 그 장면으로 이동
  const selectMemory = (memory: MemoryUnit) => {
    setSelectedMemory(memory);
    setCurrentPage(memory.pageNumber);
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
          <Timeline
            memories={memories}
            selectedMemoryId={selectedMemory?.id}
            onSelect={selectMemory}
          />
        </div>

        <QuestionPanel memories={memories} onSelectEvidence={selectMemory} />
      </div>
    </div>
  );
}
