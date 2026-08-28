/**
 * 강의 영상에서 슬라이드 구간을 찾아 PDF 페이지·전사와 잇는 순수 함수 모음.
 *
 * 영상 프레임과 PDF 페이지를 같은 크기의 흑백 축소본으로 만든 뒤 정규화 상관도로 비교한다.
 * (밝기·대비 차이를 무시하려고 평균 0, 크기 1로 맞춘다.)
 */

/** 흑백 raw 바이트 한 장 → 평균 0·크기 1의 서명 벡터 */
export function signature(bytes, offset, length) {
  const vector = new Float64Array(length);
  let mean = 0;
  for (let i = 0; i < length; i += 1) mean += bytes[offset + i];
  mean /= length;

  let norm = 0;
  for (let i = 0; i < length; i += 1) {
    vector[i] = bytes[offset + i] - mean;
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < length; i += 1) vector[i] /= norm;
  return vector;
}

/** 연속된 흑백 raw 프레임 버퍼 → 서명 벡터 배열 */
export function signatures(bytes, length) {
  if (bytes.length % length !== 0) {
    throw new Error(`Raw gray buffer is not a multiple of ${length} bytes`);
  }
  const count = bytes.length / length;
  return Array.from({ length: count }, (_, index) => signature(bytes, index * length, length));
}

export function correlation(left, right) {
  let total = 0;
  for (let i = 0; i < left.length; i += 1) total += left[i] * right[i];
  return total;
}

/**
 * 프레임마다 가장 닮은 PDF 페이지를 고른다.
 * 상관도가 minCorrelation 미만이면(예: 종료 화면) 페이지 없음으로 둔다.
 */
export function matchFrames(frames, pages, minCorrelation) {
  return frames.map((frame) => {
    let bestScore = -Infinity;
    let runnerUpScore = -Infinity;
    let bestPage = 0;

    for (let index = 0; index < pages.length; index += 1) {
      const score = correlation(frame, pages[index]);
      if (score > bestScore) {
        runnerUpScore = bestScore;
        bestScore = score;
        bestPage = index + 1;
      } else if (score > runnerUpScore) {
        runnerUpScore = score;
      }
    }

    if (bestScore < minCorrelation) return null;
    // margin이 작다는 것은 비슷한 슬라이드가 여럿이라는 뜻 (검증용 지표)
    return { pageNumber: bestPage, score: bestScore, margin: bestScore - runnerUpScore };
  });
}

/**
 * 프레임별 페이지 판정 → 슬라이드 구간.
 * minRunSeconds보다 짧은 조각은 전환 순간의 흔들림으로 보고 앞 구간에 흡수한다.
 */
export function buildSegments(matches, { secondsPerFrame, minRunSeconds }) {
  const runs = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const last = runs[runs.length - 1];
    if (last && last.pageNumber === (match?.pageNumber ?? null)) {
      last.endFrame = index;
      if (match) {
        last.scoreTotal += match.score;
        last.marginTotal += match.margin;
        last.scored += 1;
      }
      continue;
    }
    runs.push({
      pageNumber: match?.pageNumber ?? null,
      startFrame: index,
      endFrame: index,
      scoreTotal: match?.score ?? 0,
      marginTotal: match?.margin ?? 0,
      scored: match ? 1 : 0,
    });
  }

  const segments = [];
  for (const run of runs) {
    if (run.pageNumber === null) continue;
    const frames = run.endFrame - run.startFrame + 1;
    const previous = segments[segments.length - 1];

    if (previous && (frames * secondsPerFrame < minRunSeconds || previous.pageNumber === run.pageNumber)) {
      previous.endFrame = run.endFrame;
      previous.scoreTotal += run.scoreTotal;
      previous.marginTotal += run.marginTotal;
      previous.scored += run.scored;
      continue;
    }
    if (frames * secondsPerFrame < minRunSeconds) continue;
    segments.push({ ...run });
  }

  return segments.map((segment) => ({
    pageNumber: segment.pageNumber,
    start: segment.startFrame * secondsPerFrame,
    end: (segment.endFrame + 1) * secondsPerFrame - 1,
    confidence: segment.scored ? segment.scoreTotal / segment.scored : 0,
    margin: segment.scored ? segment.marginTotal / segment.scored : 0,
  }));
}

/** 전사 발언을 시작 시각이 속한 슬라이드 구간에 배정한다. */
export function assignCues(segments, cues) {
  return segments.map((segment) => ({
    ...segment,
    cues: cues.filter((cue) => cue.start >= segment.start && cue.start <= segment.end),
  }));
}

/** 구간에서 가장 내용이 많은 발언 (Memory Unit의 인용 근거로 쓴다) */
export function longestCue(cues) {
  return cues.reduce((best, cue) => (best === null || cue.text.length > best.text.length ? cue : best), null);
}
