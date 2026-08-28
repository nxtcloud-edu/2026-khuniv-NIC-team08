/** 데모 세션 공통 타입. 모든 에이전트가 이 계약을 그대로 사용한다. */

export type MemoryImportance = "exam" | "assignment" | "key" | "normal";

export interface DocumentPage {
  pageNumber: number;
  imagePath: string;
  title: string;
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
}
