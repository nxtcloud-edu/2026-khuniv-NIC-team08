/** 데모 세션 공통 타입. 모든 에이전트가 이 계약을 그대로 사용한다. */

export type MemoryImportance = "exam" | "assignment" | "key" | "normal";

export interface DocumentPage {
  pageNumber: number;
  imagePath: string;
  title: string;
  /** 처리 화면용 축소본 */
  thumbnailPath?: string;
}

/** 한 슬라이드가 화면에 떠 있던 구간. start/end는 영상 시작 기준 상대 초. */
export interface SlideSegment {
  index: number;
  pageNumber: number;
  start: number;
  end: number;
  thumbnailPath: string;
  /** 프레임-페이지 이미지 상관도 (낮으면 매칭이 애매한 구간) */
  confidence: number;
}

/** 처리 화면이 세어 올리는 실제 파이프라인 수치 */
export interface PipelineStats {
  sampledFrames: number;
  sampleIntervalSeconds: number;
  transcriptCues: number;
  assignedCues: number;
  slideSegments: number;
  pdfPages: number;
  matchedPages: number;
  memoryUnits: number;
  /** 요약을 만든 주체 (openai:모델명 또는 rule-based) */
  annotatedBy: string;
}

export interface MemoryUnit {
  id: string;
  /** "HH:MM:SS" 형식 */
  timestamp: string;
  pageNumber: number;
  transcript: string;
  summary: string;
  importance: MemoryImportance;
  keywords: string[];
  /** 이 발언이 속한 슬라이드 구간 */
  slideIndex?: number;
}

export interface DemoSession {
  id: string;
  title: string;
  /** "HH:MM:SS" 형식 */
  duration: string;
  /** 실제 강의 fixture가 제공될 때 사용하는 로컬 영상 경로 */
  videoPath?: string;
  pages: DocumentPage[];
  memories: MemoryUnit[];
  /** 실제 강의 fixture에만 있다 (mock 세션에는 없음) */
  segments?: SlideSegment[];
  pipeline?: PipelineStats;
}
