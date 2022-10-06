/*
 * Copyright The Cryostat Authors
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
import { concatMap, first, tap } from 'rxjs/operators';
import { isActiveRecording, RecordingState, Recording } from './Api.service';
import { Notifications } from '@app/Notifications/Notifications';
import { Base64 } from 'js-base64';
import { LoginService } from './Login.service';

export class ReportService {
  constructor(private login: LoginService, private notifications: Notifications) {}

  report(recording: Recording): Observable<string> {
    if (!recording?.reportUrl) {
      return throwError(() => new Error('No recording report URL'));
    }
    let stored = sessionStorage.getItem(this.key(recording));
    if (!!stored) {
      return of(stored);
    }
    return this.login.getHeaders().pipe(
      concatMap((headers) =>
        fromFetch(recording.reportUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers,
        })
      ),
      concatMap((resp) => {
        if (resp.ok) {
          return from(resp.text());
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
          const isArchived = !isActiveRecording(recording);
          const isActivedStopped = isActiveRecording(recording) && recording.state === RecordingState.STOPPED;
          if (isArchived || isActivedStopped) {
            try {
              sessionStorage.setItem(this.key(recording), report);
            } catch (error) {
              this.notifications.warning('Report Caching Failed', (error as any).message);
              sessionStorage.clear();
            }
          }
        },
        error: (err) => {
          this.notifications.danger(err.name, err.message);
          if (isGenerationError(err) && err.status >= 500) {
            err.messageDetail.pipe(first()).subscribe((detail) => {
              sessionStorage.setItem(this.key(recording), `<p>${detail}</p>`);
            });
          }
        },
      })
    );
  }

  delete(recording: Recording): void {
    sessionStorage.removeItem(this.key(recording));
  }

  private key(recording: Recording): string {
    return Base64.encode(`report.${recording.reportUrl}`);
  }
}

export type GenerationError = Error & {
  status: number;
  messageDetail: Observable<string>;
};

export const isGenerationError = (toCheck: any): toCheck is GenerationError => {
  if ((toCheck as GenerationError).name === undefined) {
    return false;
  }
  if ((toCheck as GenerationError).message === undefined) {
    return false;
  }
  if ((toCheck as GenerationError).messageDetail === undefined) {
    return false;
  }
  if ((toCheck as GenerationError).status === undefined) {
    return false;
  }
  return true;
};
