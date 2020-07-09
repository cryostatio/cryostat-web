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
import { Observable, of, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { combineLatest, concatMap, map, mergeMap, tap } from 'rxjs/operators';
import { ApiService, isActiveRecording, RecordingState, SavedRecording } from './Api.service';

export class ReportService {

  private readonly reports: Map<SavedRecording, string> = new Map();

  constructor(private api: ApiService) { }

  report(recording: SavedRecording): Observable<string> {
    if (!recording?.reportUrl) {
      return throwError('No recording report URL');
    }
    if (this.reports.has(recording)) {
      return of(this.reports.get(recording) || '<p>Invalid report cache entry</p>');
    }
    return this.api.getToken()
      .pipe(
        combineLatest(this.api.getAuthMethod()),
        mergeMap(([token, authMethod]) => {
          return fromFetch(recording.reportUrl, {
            headers: new window.Headers({ 'Authorization': `${authMethod} ${token}` }),
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
          });
        }),
        concatMap(resp => {
          if (resp.ok) {
            return resp.text();
          } else {
            throw new Error('Response not OK');
          }
        }),
        tap(report => {
          const isArchived = !isActiveRecording(recording);
          const isActivedStopped = isActiveRecording(recording) && recording.state === RecordingState.STOPPED;
          if (isArchived || isActivedStopped) {
            this.reports.set(recording, report);
          }
        })
      );
  }

}
