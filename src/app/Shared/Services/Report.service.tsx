/*
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Observable, from, of, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { concatMap, tap } from 'rxjs/operators';
import { ApiService, isActiveRecording, RecordingState, SavedRecording } from './Api.service';
import { Notifications } from '@app/Notifications/Notifications';

export class ReportService {

  private readonly reports: Map<string, string> = new window.Map();

  constructor(private api: ApiService, private notifications: Notifications) { }

  report(recording: SavedRecording): Observable<string> {
    if (!recording?.reportUrl) {
      return throwError('No recording report URL');
    }
    if (this.reports.has(recording.reportUrl)) {
      return of(this.reports.get(recording.reportUrl) || '<p>Invalid report cache entry</p>');
    }
    return this.api.getHeaders().pipe(
      concatMap(headers =>
        fromFetch(recording.reportUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers,
        })
      ),
      concatMap(resp => {
        if (resp.ok) {
          return from(resp.text());
        } else {
          const ge: GenerationError = {
            name: `Report Failure (${recording.name})`,
            message: resp.statusText,
            status: resp.status,
          };
          throw ge;
        }
      }),
      tap(report => {
        const isArchived = !isActiveRecording(recording);
        const isActivedStopped = isActiveRecording(recording) && recording.state === RecordingState.STOPPED;
        if (isArchived || isActivedStopped) {
          this.reports.set(recording.reportUrl, report);
        }
      }, err => {
        this.notifications.danger(err.name, err.message);
        if (isGenerationError(err) && err.status >= 500) {
          this.reports.set(recording.reportUrl, `<p>${err.message}</p>`);
        }
      })
    );
  }

}

type GenerationError = Error & {
  status: number;
}

const isGenerationError = (toCheck: any): toCheck is GenerationError => {
  if ((toCheck as GenerationError).name === undefined) {
    return false;
  }
  if ((toCheck as GenerationError).message === undefined) {
    return false;
  }
  if ((toCheck as GenerationError).status === undefined) {
    return false;
  }
  return true;
}
