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
  pages: DocumentPage[];
  memories: MemoryUnit[];
}
