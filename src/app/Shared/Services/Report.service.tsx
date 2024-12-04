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
import { Observable, Subject, from, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { concatMap, first, tap } from 'rxjs/operators';
import { Recording, CachedReportValue, GenerationError, AnalysisResult, NotificationCategory } from './api.types';
import { isActiveRecording, isQuotaExceededError, isGenerationError } from './api.utils';
import { NotificationChannel } from './NotificationChannel.service';
import type { NotificationService } from './Notifications.service';

export class ReportService {
  constructor(
    private notifications: NotificationService,
    channel: NotificationChannel,
  ) {
    channel.messages(NotificationCategory.ReportSuccess).subscribe((v) => {
      if (this.jobIds.delete(v.message.jobId)) {
        this._jobCompletion.next();
      }
    });
  }

  private readonly jobIds: Set<string> = new Set();
  private readonly _jobCompletion: Subject<void> = new Subject();

  reportJson(recording: Recording, connectUrl: string): Observable<AnalysisResult[]> {
    if (!recording.reportUrl) {
      return throwError(() => new Error('No Recording report URL'));
    }
    const headers = new Headers();
    headers.append('Accept', 'application/json');
    let url = new URL(recording.reportUrl, document.location.href);

    return fromFetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers,
    }).pipe(
      concatMap((resp) => {
        // 200 indicates that the backend has the report cached and it will return
        // the json in the response.
        if (resp.ok) {
          if (resp.status == 202) {
            this.notifications.info('Report generation in progress', 'Report is being generated');
            resp.text().then((value) => this.jobIds.add(value));
          }
          return from(
            resp
              .text()
              .then(JSON.parse)
              .then((obj) => Object.values(obj) as AnalysisResult[]),
          );
        } else {
          const ge: GenerationError = {
            name: `Report Failure (${recording.name})`,
            message: resp.statusText,
            messageDetail: from(resp.text()),
            status: resp.status,
          };
          throw ge;
        }
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
                // see https://mmazzarolo.com/blog/2022-06-25-local-storage-status/
                this.notifications.warning('Report Caching Failed', 'localStorage is not available');
                this.delete(recording);
              }
            }
          }
        },
        error: (err) => {
          if (isGenerationError(err) && err.status >= 500) {
            err.messageDetail.pipe(first()).subscribe((detail) => {
              this.notifications.warning(`Report generation failure: ${detail}`);
              this.deleteCachedAnalysisReport(connectUrl);
            });
          } else {
            this.notifications.danger(err.name, err.message);
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

  onJobCompletion(): Observable<void> {
    return this._jobCompletion.asObservable();
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
