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
import { HeapDumpAnalysisResult } from '@app/Diagnostics/Analysis/HeapDumps/types';
import { Base64 } from 'js-base64';
import { concatMap, map, Observable } from 'rxjs';
import { ApiService } from './Api.service';
import { CachedHeapDumpReportValue, NotificationCategory } from './api.types';
import { NotificationChannel } from './NotificationChannel.service';

export interface HeapDumpAnalysisResponse {
  jobId: string;
  result: HeapDumpAnalysisResult;
}

export class HeapDumpReportService {
  constructor(
    private readonly api: ApiService,
    private readonly channel: NotificationChannel,
  ) {}

  reportJson(jvmId: string, heapDumpId: string): Observable<HeapDumpAnalysisResponse> {
    const jobCompletion$ = this.channel
      .replayableMessages(NotificationCategory.HeapDumpAnalysisSuccess)
      .pipe(map((v) => v.message.jobId));

    return this.api.analyzeHeapDump(jvmId, heapDumpId, jobCompletion$).pipe(
      concatMap(({ jobId, response }) =>
        response
          .text()
          .then(JSON.parse)
          .then((obj) => ({ jobId, result: obj as HeapDumpAnalysisResult })),
      ),
    );
  }

  getCachedAnalysisReport(connectUrl: string): CachedHeapDumpReportValue {
    const stored = sessionStorage.getItem(this.analysisKey(connectUrl));
    const storedTimestamp = Number(sessionStorage.getItem(this.analysisKeyTimestamp(connectUrl)));
    if (stored) {
      return {
        report: JSON.parse(stored),
        timestamp: storedTimestamp || 0,
      };
    }
    return {
      report: {
        problemCollections: [],
        duplicateArrays: [],
        duplicateStrings: [],
        highSizeObjects: [],
        weakHashMapClusters: [],
        objectHistogram: [],
        nullProblemFields: [],
        nearNullProblemFields: [],
        fullBytesFields: [],
        highBytesFields: [],
        classLoaderInstanceStats: [],
        classLoaderClassStats: [],
        compressibleStringStats: {
          stringObjects: 0,
          backingArrayBytes: 0,
          compressedStrings: 0,
          compressedStringBytes: 0,
          asciiStrings: 0,
          asciiStringBytes: 0,
        },
        duplicateStringStats: {
          totalStrings: 0,
          uniqueStrings: 0,
          duplicateStrings: 0,
          overhead: 0,
        },
        histogramStats: {
          totalClasses: 0,
          totalObjects: 0,
          zeroInstances: 0,
          singleInstances: 0,
        },
        fundamentalStats: {
          pointerSize: 0,
          narrowPointers: false,
          objectHeaderSize: 0,
          objectHeaderAlignment: 0,
          numObjects: 0,
          objectInstances: 0,
          objectArrays: 0,
          primitiveArrays: 0,
          objectSize: 0,
          instanceSize: 0,
          objArraySize: 0,
          primitiveSize: 0,
        },
      },
      timestamp: 0,
    };
  }

  delete(heapDump: string): void {
    sessionStorage.removeItem(this.key(heapDump));
  }

  deleteCachedAnalysisReport(connectUrl: string): void {
    sessionStorage.removeItem(this.analysisKey(connectUrl));
    sessionStorage.removeItem(this.analysisKeyTimestamp(connectUrl));
  }

  private key(heapDump: string): string {
    return Base64.encode(`heapDumpReport.${heapDump}`);
  }

  private analysisKey(connectUrl: string): string {
    return Base64.encode(`${connectUrl}.latestReport`);
  }

  private analysisKeyTimestamp(connectUrl: string): string {
    return Base64.encode(`${connectUrl}.latestReportTimestamp`);
  }
}
