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
import { Observable, throwError } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
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
  ) {}

  reportJson(recording: Recording, connectUrl: string): Observable<AnalysisResult[]> {
    if (!recording.reportUrl) {
      return throwError(() => new Error('No Recording report URL'));
    }

    const jobCompletion$ = this.channel
      .replayableMessages(NotificationCategory.ReportSuccess)
      .pipe(map((v) => v.message.jobId));

    return this.api.generateReport(recording.reportUrl, jobCompletion$).pipe(
      concatMap(({ response }) =>
        response
          .text()
          .then(JSON.parse)
          .then((obj) => Object.values(obj) as AnalysisResult[]),
      ),
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
