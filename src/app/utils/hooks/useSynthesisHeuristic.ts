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
import * as React from 'react';

export interface SynthesisHeuristic {
  candidates: ArchivedRecording[];
  heuristicEarliest: number | null;
  heuristicLatest: number | null;
  estimatedSizeBytes: number;
  coverageRatio: number;
  gapMs: number;
}

/**
 * Returns timing info for a recording using its labels and archivedTime.
 * Returns null if the recording lacks sufficient timing data and should be excluded.
 */
const getRecordingTiming = (r: ArchivedRecording): { startMs: number; endMs: number; durationMs: number } | null => {
  if (!r.archivedTime) return null;

  const labels: Record<string, string> = {};
  (r.metadata?.labels ?? []).forEach(({ key, value }) => {
    labels[key] = value;
  });

  const startTimeMs = labels['startTime'] !== undefined ? Number(labels['startTime']) : NaN;
  const durationMs = labels['duration'] !== undefined ? Number(labels['duration']) : NaN;

  if (isNaN(startTimeMs) || isNaN(durationMs) || startTimeMs === 0) return null;

  return { startMs: startTimeMs, endMs: startTimeMs + durationMs, durationMs };
};

const NO_CANDIDATES = {
  candidates: [],
  heuristicEarliest: null,
  heuristicLatest: null,
  estimatedSizeBytes: 0,
  coverageRatio: 0,
  gapMs: 0,
};

export const useSynthesisHeuristic = (
  recordings: ArchivedRecording[],
  fromMs: number | null,
  toMs: number | null,
): SynthesisHeuristic => {
  return React.useMemo((): SynthesisHeuristic => {
    if (!fromMs || !toMs || fromMs >= toMs || !recordings.length) {
      return NO_CANDIDATES;
    }

    const candidates = recordings.filter((r) => {
      const timing = getRecordingTiming(r);
      if (!timing) return false;
      // Exclude if the recording's entire span falls outside the requested window.
      return !(timing.endMs <= fromMs || timing.startMs >= toMs);
    });

    if (!candidates.length) {
      return NO_CANDIDATES;
    }

    let earliest = Infinity;
    let latest = -Infinity;
    let sizeBytes = 0;

    candidates.forEach((r) => {
      const timing = getRecordingTiming(r)!;
      if (timing.startMs < earliest) earliest = timing.startMs;
      if (timing.endMs > latest) latest = timing.endMs;
      sizeBytes += r.size;
    });

    const windowMs = toMs - fromMs;
    const coveredMs = Math.min(latest - earliest, windowMs);
    const coverageRatio = windowMs > 0 ? Math.min(coveredMs / windowMs, 1) : 0;
    const gapMs = Math.max(windowMs - (latest - earliest), 0);

    return {
      candidates,
      heuristicEarliest: earliest === Infinity ? null : earliest,
      heuristicLatest: latest === -Infinity ? null : latest,
      estimatedSizeBytes: sizeBytes,
      coverageRatio,
      gapMs,
    };
  }, [recordings, fromMs, toMs]);
};
