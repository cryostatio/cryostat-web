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
import { Base64 } from 'js-base64';
import { Observable, Subject, throwError } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { ApiService } from './Api.service';
import { Recording, CachedReportValue, AnalysisResult, NotificationCategory } from './api.types';
import { isActiveRecording, isQuotaExceededError } from './api.utils';
import { NotificationChannel } from './NotificationChannel.service';
import type { NotificationService } from './Notifications.service';

export class ReportService {
  constructor(
    private api: ApiService,
    private notifications: NotificationService,
    private readonly channel: NotificationChannel,
  ) {
    channel.replayableMessages(NotificationCategory.ReportSuccess).subscribe((v) => {
      if (this.jobIds.has(v.message.jobId)) {
        this._jobCompletion.next(v.message.jobId);
      }
    });
  }

  // Resolves the pending job if a completion notification for it was already replayed
  // before the job ID was registered (i.e. the notification arrived before the HTTP 202
  // response was processed). The ReplaySubject delivers buffered messages synchronously
  // on subscribe, so we drain and immediately unsubscribe to avoid catching live messages,
  // which are already handled by the constructor subscription.
  private checkReplayBuffer(jobId: string): void {
    const sub = this.channel.replayableMessages(NotificationCategory.ReportSuccess).subscribe((v) => {
      if (v.message.jobId === jobId && this.jobIds.has(jobId)) {
        this._jobCompletion.next(jobId);
      }
    });
    sub.unsubscribe();
  }

  private readonly jobIds: Map<string, string> = new Map();
  private readonly _jobCompletion: Subject<string> = new Subject();

  reportJson(recording: Recording, connectUrl: string): Observable<AnalysisResult[]> {
    if (!recording.reportUrl) {
      return throwError(() => new Error('No Recording report URL'));
    }
    return this.api.generateReport(recording.reportUrl, this._jobCompletion.asObservable()).pipe(
      concatMap(({ jobId, response }) => {
        this.jobIds.set(jobId, recording.reportUrl);
        return response
          .text()
          .then(JSON.parse)
          .then((obj) => {
            if (jobId) {
              this.jobIds.delete(jobId);
              this.checkReplayBuffer(jobId);
            }
            return Object.values(obj) as AnalysisResult[];
          });
      }),
      tap({
        next: (report) => {
          if (isActiveRecording(recording)) {
            try {
              sessionStorage.setItem(this.analysisKey(connectUrl), JSON.stringify(report));
              sessionStorage.setItem(this.analysisKeyTimestamp(connectUrl), Date.now().toString());
            } catch (err) {
              if (isQuotaExceededError(err)) {
                this.notifications.warning('Report Caching Failed', err.message);
                this.delete(recording);
              } else {
                this.notifications.warning('Report Caching Failed', 'localStorage is not available');
                this.delete(recording);
              }
            }
          }
        },
      }),
    );
  }

  getCachedAnalysisReport(connectUrl: string): CachedReportValue {
    const stored = sessionStorage.getItem(this.analysisKey(connectUrl));
    const storedTimestamp = Number(sessionStorage.getItem(this.analysisKeyTimestamp(connectUrl)));
    if (stored) {
      return {
        report: JSON.parse(stored),
        timestamp: storedTimestamp || 0,
      };
    }
    return {
      report: [],
      timestamp: 0,
    };
  }

  delete(recording: Recording): void {
    sessionStorage.removeItem(this.key(recording));
  }

  deleteCachedAnalysisReport(connectUrl: string): void {
    sessionStorage.removeItem(this.analysisKey(connectUrl));
    sessionStorage.removeItem(this.analysisKeyTimestamp(connectUrl));
  }

  private key(recording: Recording): string {
    return Base64.encode(`report.${recording.reportUrl}`);
  }

  private analysisKey(connectUrl: string): string {
    return Base64.encode(`${connectUrl}.latestReport`);
  }

  private analysisKeyTimestamp(connectUrl: string): string {
    return Base64.encode(`${connectUrl}.latestReportTimestamp`);
  }
}
