/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ArchivedRecording } from '@app/Shared/Services/api.types';
import { useSynthesisHeuristic } from '@app/utils/hooks/useSynthesisHeuristic';
import { renderHook } from '@testing-library/react';

// The hook's getRecordingTiming() requires:
//   - r.archivedTime is truthy (non-zero)
//   - label keys 'startTime' (ms epoch) and 'duration' (ms)
//   - startTimeMs !== 0
// The hook's early-return guard uses !fromMs, so fromMs=0 is treated as "no value".
// All timestamps in tests use 1_000 ms as minimum non-zero epoch.

const BASE = 1_000_000; // a convenient non-zero epoch base (ms)

const makeRecording = (
  startMs: number,
  durationMs: number,
  sizeBytes = 1024,
  name = `rec-${startMs}`,
): ArchivedRecording => ({
  name,
  downloadUrl: '',
  reportUrl: '',
  metadata: {
    labels: [
      { key: 'startTime', value: String(startMs) },
      { key: 'duration', value: String(durationMs) },
    ],
  },
  size: sizeBytes,
  // archivedTime must be truthy; use end time in seconds
  archivedTime: Math.floor((startMs + durationMs) / 1000),
});

describe('useSynthesisHeuristic', () => {
  describe('early-return cases', () => {
    it('returns all-zero/null when recordings array is empty', () => {
      const { result } = renderHook(() => useSynthesisHeuristic([], BASE + 1000, BASE + 2000));
      expect(result.current.candidates).toHaveLength(0);
      expect(result.current.heuristicEarliest).toBeNull();
      expect(result.current.heuristicLatest).toBeNull();
      expect(result.current.estimatedSizeBytes).toBe(0);
      expect(result.current.coverageRatio).toBe(0);
      expect(result.current.gapMs).toBe(0);
    });

    it('returns all-zero/null when fromMs is null', () => {
      const rec = makeRecording(BASE + 500, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], null, BASE + 2000));
      expect(result.current.candidates).toHaveLength(0);
      expect(result.current.heuristicEarliest).toBeNull();
    });

    it('returns all-zero/null when toMs is null', () => {
      const rec = makeRecording(BASE + 500, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 1000, null));
      expect(result.current.candidates).toHaveLength(0);
      expect(result.current.heuristicEarliest).toBeNull();
    });

    it('returns all-zero/null when fromMs >= toMs', () => {
      const rec = makeRecording(BASE + 500, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 2000, BASE + 1000));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('returns all-zero/null when fromMs === toMs', () => {
      const rec = makeRecording(BASE + 500, 2000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 1000, BASE + 1000));
      expect(result.current.candidates).toHaveLength(0);
    });
  });

  describe('candidate filtering', () => {
    const from = BASE + 1000;
    const to = BASE + 2000;

    it('excludes a recording whose end is exactly at fromMs (endMs <= fromMs)', () => {
      // startMs = BASE, durationMs = 1000 → endMs = BASE+1000 = fromMs → excluded
      const rec = makeRecording(BASE, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('excludes a recording whose start is exactly at toMs (startMs >= toMs)', () => {
      // startMs = BASE+2000 = toMs → excluded
      const rec = makeRecording(BASE + 2000, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('excludes a recording entirely before the window', () => {
      // [BASE, BASE+400] ends before fromMs
      const rec = makeRecording(BASE, 400);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('excludes a recording entirely after the window', () => {
      const rec = makeRecording(BASE + 3000, 500);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('includes a recording that overlaps the start of the window', () => {
      // [BASE+500, BASE+1500] overlaps [from=BASE+1000, to=BASE+2000]
      const rec = makeRecording(BASE + 500, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(1);
    });

    it('includes a recording that overlaps the end of the window', () => {
      // [BASE+1500, BASE+2500] overlaps
      const rec = makeRecording(BASE + 1500, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(1);
    });

    it('includes a recording fully inside the window', () => {
      const rec = makeRecording(BASE + 1100, 500);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(1);
    });

    it('includes a recording that fully contains the window', () => {
      const rec = makeRecording(BASE + 500, 2000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(1);
    });

    it('excludes recordings without required timing labels', () => {
      const noLabels: ArchivedRecording = {
        name: 'no-timing',
        downloadUrl: '',
        reportUrl: '',
        metadata: { labels: [] },
        size: 512,
        archivedTime: 999999,
      };
      const { result } = renderHook(() => useSynthesisHeuristic([noLabels], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('excludes recordings with archivedTime of zero (falsy)', () => {
      const zeroTime: ArchivedRecording = {
        name: 'zero-time',
        downloadUrl: '',
        reportUrl: '',
        metadata: {
          labels: [
            { key: 'startTime', value: String(BASE + 1100) },
            { key: 'duration', value: '500' },
          ],
        },
        size: 512,
        archivedTime: 0,
      };
      const { result } = renderHook(() => useSynthesisHeuristic([zeroTime], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('excludes a recording with zero duration', () => {
      const rec = makeRecording(BASE + 1100, 0);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });

    it('excludes a recording with negative duration', () => {
      const rec = makeRecording(BASE + 1100, -500);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], from, to));
      expect(result.current.candidates).toHaveLength(0);
    });
  });

  describe('single candidate fully covering the window', () => {
    it('reports coverage 1.0, zero gap, correct bounds', () => {
      // window [BASE+1000, BASE+3000] = 2000 ms; recording [BASE+800, BASE+3200] covers it fully
      const rec = makeRecording(BASE + 800, 2400, 4096);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 1000, BASE + 3000));
      expect(result.current.candidates).toHaveLength(1);
      expect(result.current.coverageRatio).toBe(1);
      expect(result.current.gapMs).toBe(0);
      expect(result.current.heuristicEarliest).toBe(BASE + 800);
      expect(result.current.heuristicLatest).toBe(BASE + 3200);
      expect(result.current.estimatedSizeBytes).toBe(4096);
    });
  });

  describe('single candidate partially overlapping the window', () => {
    it('reports coverage < 1 and positive gap', () => {
      // window [BASE+1000, BASE+5000] = 4000 ms; recording [BASE+2000, BASE+4000] spans 2000 ms
      // clipped to window: [BASE+2000, BASE+4000] → coveredMs = 2000
      // coverageRatio = 2000/4000 = 0.5; gapMs = 4000-2000 = 2000
      const rec = makeRecording(BASE + 2000, 2000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 1000, BASE + 5000));
      expect(result.current.coverageRatio).toBeCloseTo(0.5);
      expect(result.current.gapMs).toBe(2000);
    });
  });

  describe('multiple candidates with a gap between them', () => {
    it('reports gapMs when candidates span less than the window', () => {
      // window [BASE+1000, BASE+11000] = 10000 ms
      // rec1 [BASE+2000, BASE+4000], rec2 [BASE+6000, BASE+8000]
      // clipped union: [BASE+2000,BASE+4000] + [BASE+6000,BASE+8000] = 4000 ms covered
      // gapMs = 10000 - 4000 = 6000
      const rec1 = makeRecording(BASE + 2000, 2000, 1000, 'rec1');
      const rec2 = makeRecording(BASE + 6000, 2000, 2000, 'rec2');
      const { result } = renderHook(() => useSynthesisHeuristic([rec1, rec2], BASE + 1000, BASE + 11000));
      expect(result.current.candidates).toHaveLength(2);
      expect(result.current.gapMs).toBe(6000);
    });

    it('reports gapMs of 0 when candidates together span the full window', () => {
      // window [BASE+1000, BASE+6000] = 5000 ms
      // rec1 [BASE+1000, BASE+3000], rec2 [BASE+3000, BASE+6000]
      // earliest=BASE+1000, latest=BASE+6000, span=5000; gapMs = max(5000-5000, 0) = 0
      const rec1 = makeRecording(BASE + 1000, 2000, 1000, 'r1');
      const rec2 = makeRecording(BASE + 3000, 3000, 1000, 'r2');
      const { result } = renderHook(() => useSynthesisHeuristic([rec1, rec2], BASE + 1000, BASE + 6000));
      expect(result.current.candidates).toHaveLength(2);
      expect(result.current.gapMs).toBe(0);
    });
  });

  describe('estimatedSizeBytes', () => {
    it('sums sizes of candidate recordings only, excluding non-overlapping ones', () => {
      // window [BASE+1000, BASE+3000]
      // rec1 inside (size 512), rec2 entirely before window (size 9999) → endMs = BASE+1000 = fromMs → excluded
      const rec1 = makeRecording(BASE + 1200, 500, 512, 'inside');
      const rec2 = makeRecording(BASE, 1000, 9999, 'before'); // endMs = BASE+1000 = from → excluded
      const { result } = renderHook(() => useSynthesisHeuristic([rec1, rec2], BASE + 1000, BASE + 3000));
      expect(result.current.candidates).toHaveLength(1);
      expect(result.current.estimatedSizeBytes).toBe(512);
    });

    it('sums sizes of all candidates when multiple qualify', () => {
      const rec1 = makeRecording(BASE + 1000, 500, 100, 'r1');
      const rec2 = makeRecording(BASE + 1500, 500, 200, 'r2');
      const { result } = renderHook(() => useSynthesisHeuristic([rec1, rec2], BASE + 900, BASE + 2500));
      expect(result.current.candidates).toHaveLength(2);
      expect(result.current.estimatedSizeBytes).toBe(300);
    });
  });

  describe('heuristicEarliest / heuristicLatest', () => {
    it('returns null for both when no candidates', () => {
      const rec = makeRecording(BASE + 5000, 1000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 1000, BASE + 2000));
      expect(result.current.heuristicEarliest).toBeNull();
      expect(result.current.heuristicLatest).toBeNull();
    });

    it('reports the earliest startMs and latest endMs across all candidates', () => {
      // rec1 [BASE+1000, BASE+3000], rec2 [BASE+500, BASE+1500] (partially before from, still overlaps)
      // rec3 [BASE+2000, BASE+5000]
      // window [BASE+400, BASE+6000]
      const rec1 = makeRecording(BASE + 1000, 2000, 1, 'r1');
      const rec2 = makeRecording(BASE + 500, 1000, 1, 'r2');
      const rec3 = makeRecording(BASE + 2000, 3000, 1, 'r3');
      const { result } = renderHook(() => useSynthesisHeuristic([rec1, rec2, rec3], BASE + 400, BASE + 6000));
      expect(result.current.heuristicEarliest).toBe(BASE + 500);
      expect(result.current.heuristicLatest).toBe(BASE + 5000);
    });
  });

  describe('coverageRatio clamped to 1', () => {
    it('does not exceed 1.0 when recording span exceeds window', () => {
      // Recording [BASE+500, BASE+10500] inside window [BASE+1000, BASE+3000]
      // span = 10000; windowMs = 2000; coveredMs = min(10000, 2000) = 2000; ratio = 1
      const rec = makeRecording(BASE + 500, 10000);
      const { result } = renderHook(() => useSynthesisHeuristic([rec], BASE + 1000, BASE + 3000));
      expect(result.current.coverageRatio).toBe(1);
    });
  });
});
