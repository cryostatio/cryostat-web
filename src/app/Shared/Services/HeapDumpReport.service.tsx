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
import { combineLatest, concatMap, filter, from, map, Observable, Subject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { CachedHeapDumpReportValue, GenerationError, NotificationCategory } from './api.types';
import { NotificationChannel } from './NotificationChannel.service';
import { CryostatContext } from './Services';

export class HeapDumpReportService {
  constructor(
    private ctx: CryostatContext,
    channel: NotificationChannel,
  ) {
    channel.messages(NotificationCategory.HeapDumpAnalysisSuccess).subscribe((v) => {
      if (this.jobIds.has(v.message.jobId)) {
        this._jobCompletion.next(v.message.jobId);
      }
    });
  }

  private readonly jobIds: Map<string, string> = new Map();
  private readonly _jobCompletion: Subject<string> = new Subject();

  reportJson(jvmId: string, heapDumpId: string): Observable<HeapDumpAnalysisResult> {
    const headers = new Headers();
    headers.append('Accept', 'application/json');
    const req = () =>
      combineLatest([
        this.ctx.url(`/api/beta/diagnostics/targets/${jvmId}/heapdump/${heapDumpId}/analyze`),
        this.ctx.headers(headers).pipe(
          map((headers) => {
            let cfg: RequestInit = {};
            cfg.method = 'POST';
            cfg.mode = 'cors';
            cfg.credentials = 'include';
            cfg.headers = headers;
            return cfg;
          }),
        ),
      ]).pipe(
        concatMap((parts) =>
          fromFetch(parts[0], parts[1]).pipe(
            concatMap((resp) => {
              // 200 indicates that the backend has the report cached and it will return
              // the json in the response.
              if (resp.ok) {
                // 202 indicates that the backend does not have the report cached and will return an
                // async job ID in the response immediately, then emit a notification with the same
                // job ID later to inform us that the report is now ready and can be retrieved by
                // sending a follow-up GET to the Location header value
                if (resp.status == 202) {
                  let subj = new Subject<HeapDumpAnalysisResult>();
                  resp.text().then((jobId) => {
                    this.jobIds.set(jobId, parts[0]);
                    this._jobCompletion
                      .asObservable()
                      .pipe(filter((id) => id === jobId))
                      .subscribe((id) => {
                        const jobUrl = this.jobIds.get(id);
                        if (!jobUrl) throw new Error(`Unknown job ID: ${id}`);
                        this.jobIds.delete(id);
                        fromFetch(parts[0], parts[1]).subscribe((resp) => {
                          if (resp.ok && resp.status === 200) {
                            resp
                              .text()
                              .then(JSON.parse)
                              .then((obj) => subj.next(obj as HeapDumpAnalysisResult));
                          } else {
                            const ge: GenerationError = {
                              name: `Heap Dump Report Failure (${heapDumpId})`,
                              message: resp.statusText,
                              messageDetail: from(resp.text()),
                              status: resp.status,
                            };
                            subj.error(ge);
                          }
                        });
                      });
                  });
                  return subj.asObservable();
                }
                return from(
                  resp
                    .text()
                    .then(JSON.parse)
                    .then((obj) => obj as HeapDumpAnalysisResult),
                );
              } else {
                const ge: GenerationError = {
                  name: `Report Failure (${heapDumpId})`,
                  message: resp.statusText,
                  messageDetail: from(resp.text()),
                  status: resp.status,
                };
                throw ge;
              }
            }),
          ),
        ),
      );
    return req();
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
