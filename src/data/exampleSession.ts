import manifest from "../../example/session.json";
import type { DemoSession, MemoryImportance } from "../types/session";

export const exampleSession: DemoSession = {
  id: manifest.id,
  title: manifest.title,
  duration: manifest.duration,
  videoPath: manifest.fixture.videoPath,
  pages: manifest.pages,
  segments: manifest.segments,
  pipeline: manifest.pipeline,
  memories: manifest.memories.map((memory) => ({
    id: memory.id,
    timestamp: memory.timestamp,
    pageNumber: memory.pageNumber,
    transcript: memory.transcript,
    summary: memory.summary,
    importance: memory.importance as MemoryImportance,
    keywords: memory.keywords,
    slideIndex: memory.slideIndex,
  })),
};
