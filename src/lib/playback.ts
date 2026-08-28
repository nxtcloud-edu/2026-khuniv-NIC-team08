/**
 * 재생 위치로 지금 보고 있어야 할 슬라이드와 발언을 찾는다.
 *
 * 영상이 재생되는 동안 매초 호출되므로 이진 탐색을 쓴다.
 * segments는 시간순으로 정렬된 [start, end] 구간이며 서로 겹치지 않는다.
 */

import type { MemoryUnit, SlideSegment } from "../types/session";

/** "HH:MM:SS" → 초 */
export function timestampToSeconds(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/** 해당 시각을 담고 있는 슬라이드 구간. 구간 사이의 빈틈이면 undefined. */
export function segmentAtSecond(
  segments: SlideSegment[],
  seconds: number,
): SlideSegment | undefined {
  let low = 0;
  let high = segments.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const segment = segments[middle];
    if (seconds < segment.start) high = middle - 1;
    else if (seconds > segment.end) low = middle + 1;
    else return segment;
  }
  return undefined;
}

/** 재생 위치보다 앞서 있는 마지막 발언 (타임라인에서 지금 지점을 표시할 때 쓴다) */
export function memoryAtSecond(
  memories: MemoryUnit[],
  seconds: number,
): MemoryUnit | undefined {
  let found: MemoryUnit | undefined;
  let low = 0;
  let high = memories.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (timestampToSeconds(memories[middle].timestamp) <= seconds) {
      found = memories[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
