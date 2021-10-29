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
import { from, Observable, ObservableInput, of, ReplaySubject, forkJoin, throwError, EMPTY } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, concatMap, first, map, mergeMap, tap } from 'rxjs/operators';
import { Target, TargetService } from './Target.service';
import { Notifications } from '@app/Notifications/Notifications';
import { AuthMethod, LoginService, SessionState } from './Login.service';

type ApiVersion = "v1" | "v2";

export class HttpError extends Error {
  readonly httpResponse: Response;

  constructor(httpResponse: Response) {
    super(httpResponse.statusText);
    this.httpResponse = httpResponse;
  }
}

export const isHttpError = (toCheck: any): toCheck is HttpError => {
  if (!(toCheck instanceof Error)) {
    return false;
  }
  return (toCheck as HttpError).httpResponse !== undefined;
}

export class ApiService {

  private readonly archiveEnabled = new ReplaySubject<boolean>(1);
  private readonly cryostatVersionSubject = new ReplaySubject<string>(1);
  private readonly grafanaDatasourceUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDashboardUrlSubject = new ReplaySubject<string>(1);

  constructor(
    private readonly target: TargetService,
    private readonly notifications: Notifications,
    private readonly login: LoginService
  ) {

    // show recording archives when recordings available
    login.getSessionState().pipe(
    concatMap((sessionState) => sessionState === SessionState.USER_SESSION ? this.doGet('recordings') : EMPTY)
    )
    .subscribe({
      next: () => {
        this.archiveEnabled.next(true);
      },
      error: () => {
        this.archiveEnabled.next(false);
      }
    });

    const getDatasourceURL = fromFetch(`${this.login.authority}/api/v1/grafana_datasource_url`)
    .pipe(concatMap(resp => from(resp.json())));
    const getDashboardURL = fromFetch(`${this.login.authority}/api/v1/grafana_dashboard_url`)
    .pipe(concatMap(resp => from(resp.json())));

    fromFetch(`${this.login.authority}/health`)
      .pipe(
        concatMap(resp => from(resp.json())),
        concatMap((jsonResp: any) => {
          if (!!jsonResp.cryostatVersion && jsonResp.dashboardAvailable && jsonResp.datasourceAvailable) {
            return forkJoin([of(jsonResp.cryostatVersion), getDatasourceURL, getDashboardURL]);
          } else {
            const missing: string[] = [];
            if (!jsonResp.cryostatVersion) {
              missing.push('Cryostat version');
            }
            if (!jsonResp.dashboardAvailable) {
              missing.push('dashboard URL');
            }
            if (!jsonResp.datasourceAvailable) {
              missing.push('datasource URL');
            }
            const message = missing.join(', ') + ' unavailable';
            return throwError(() => new Error(message));
          }}))
      .subscribe({
        next: (parts: any) => {
          this.cryostatVersionSubject.next(parts[0]);
          this.grafanaDatasourceUrlSubject.next(parts[1].grafanaDatasourceUrl);
          this.grafanaDashboardUrlSubject.next(parts[2].grafanaDashboardUrl);
        },
        error: err => {
          window.console.error(err);
          this.notifications.danger('Grafana configuration not found', JSON.stringify(err));
        }
      });
  }

  createTarget(target: Target): Observable<boolean> {
    const form = new window.FormData();
    form.append('connectUrl', target.connectUrl);
    if (!!target.alias && !!target.alias.trim()) {
      form.append('alias', target.alias);
    }
    return this.sendRequest(
      'v2', `targets`,
      {
        method: 'POST',
        body: form,
      }
    ).pipe(
      map(resp => resp.ok),
      first(),
    );
  }

  deleteTarget(target: Target): Observable<boolean> {
    return this.sendRequest(
      'v2', `targets/${encodeURIComponent(target.connectUrl)}`,
      {
        method: 'DELETE',
      }
    ).pipe(
      map(resp => resp.ok),
      first(),
    );
  }

  createRecording(recordingAttributes: RecordingAttributes): Observable<boolean> {
    const form = new window.FormData();
    form.append('recordingName', recordingAttributes.name);
    form.append('events', recordingAttributes.events);
    if (!!recordingAttributes.duration && recordingAttributes.duration > 0) {
      form.append('duration', String(recordingAttributes.duration));
    }
    if (!!recordingAttributes.options){
      if (recordingAttributes.options.toDisk != null) {
        form.append('toDisk', String(recordingAttributes.options.toDisk));
      }
      if (!!recordingAttributes.options.maxAge && recordingAttributes.options.maxAge >= 0) {
        form.append('maxAge', String(recordingAttributes.options.maxAge));
      }
      if (!!recordingAttributes.options.maxSize && recordingAttributes.options.maxSize >= 0) {
        form.append('maxSize', String(recordingAttributes.options.maxSize));
      }
    }

    return this.target.target().pipe(concatMap(target =>
      this.sendRequest('v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings`, {
        method: 'POST',
        body: form,
      }).pipe(
        map(resp => resp.ok),
        first(),
      )));
  }

  createSnapshot(): Observable<boolean> {
    return this.target.target().pipe(concatMap(target =>
      this.sendRequest('v1', `targets/${encodeURIComponent(target.connectUrl)}/snapshot`, {
        method: 'POST',
      }).pipe(
        tap(resp => {
          if (resp.ok) {
            this.notifications.success('Recording created');
          }
        }),
        map(resp => resp.ok),
        first(),
      )
    ));
  }

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable();
  }

  archiveRecording(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(concatMap(target =>
      this.sendRequest(
        'v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}`,
        {
          method: 'PATCH',
          body: 'SAVE',
        }
      ).pipe(
        map(resp => resp.ok),
        first(),
      )
    ));
  }

  stopRecording(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(concatMap(target =>
      this.sendRequest(
        'v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}`,
        {
          method: 'PATCH',
          body: 'STOP',
        }
      ).pipe(
        map(resp => resp.ok),
        first(),
      )
    ));
  }

  deleteRecording(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(concatMap(target =>
      this.sendRequest(
        'v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}`,
        {
          method: 'DELETE',
        }
      ).pipe(
        map(resp => resp.ok),
        first(),
      )
    ));
  }

  deleteArchivedRecording(recordingName: string): Observable<boolean> {
    return this.sendRequest('v1', `recordings/${encodeURIComponent(recordingName)}`, {
      method: 'DELETE'
    }).pipe(
      map(resp => resp.ok),
      first(),
    );
  }

  uploadActiveRecordingToGrafana(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(concatMap(target =>
      this.sendRequest(
        'v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}/upload`,
        {
          method: 'POST',
        }
      ).pipe(
        map(resp => resp.ok),
        first()
      )
    ));
  }

  uploadArchivedRecordingToGrafana(recordingName: string): Observable<boolean> {
    return this.sendRequest(
        'v1', `recordings/${encodeURIComponent(recordingName)}/upload`,
        {
          method: 'POST',
        }
      ).pipe(
        map(resp => resp.ok),
        first()
      )
    ;
  }

  deleteCustomEventTemplate(templateName: string): Observable<void> {
    return this.sendRequest('v1', `templates/${encodeURIComponent(templateName)}`, {
      method: 'DELETE',
      body: null,
    })
    .pipe(
      map(response => {
        if (!response.ok) {
          throw response.statusText;
        }
      }),
      catchError((): ObservableInput<void> => of()),
    );
  }

  addCustomEventTemplate(file: File): Observable<boolean> {
    const body = new window.FormData();
    body.append('template', file);
    return this.sendRequest('v1', `templates`, {
      method: 'POST',
      body,
    })
    .pipe(
      map(response => {
        if (!response.ok) {
          throw response.statusText;
        }
        return true;
      }),
      catchError((): ObservableInput<boolean> => of(false)),
    );
  }

  cryostatVersion(): Observable<string> {
    return this.cryostatVersionSubject.asObservable();
  }

  grafanaDatasourceUrl(): Observable<string> {
    return this.grafanaDatasourceUrlSubject.asObservable();
  }

  grafanaDashboardUrl(): Observable<string> {
    return this.grafanaDashboardUrlSubject.asObservable();
  }

  doGet<T>(path: string): Observable<T> {
    return this.sendRequest('v1', path, { method: 'GET' }).pipe(map(resp => resp.json()), concatMap(from), first());
  }

  downloadReport(recording: SavedRecording): void {
    this.login.getHeaders().subscribe(headers => {
      const req = () =>
        fromFetch(recording.reportUrl, {
          credentials: 'include',
          mode: 'cors',
          headers,
        })
          .pipe(
            map(resp => {
              if (resp.ok) return resp;
              throw new HttpError(resp);
            }),
            catchError(err => this.handleError<Response>(err, req)),
            concatMap(resp => resp.blob()),
          );
      req().subscribe(resp =>
        this.downloadFile(
          `${recording.name}.report.html`,
          resp,
          'text/html')
      )
    });
  }

  downloadRecording(recording: SavedRecording): void {
    this.login.getHeaders().subscribe(headers => {
      const req = () => fromFetch(recording.downloadUrl, {
        credentials: 'include',
        mode: 'cors',
        headers,
      })
        .pipe(
          map(resp => {
            if (resp.ok) return resp;
            throw new HttpError(resp);
          }),
          catchError(err => this.handleError<Response>(err, req)),
          concatMap(resp => resp.blob()),
        );
      req().subscribe(resp =>
        this.downloadFile(
          recording.name + (recording.name.endsWith('.jfr') ? '' : '.jfr'),
          resp,
          'application/octet-stream')
      )
    });
  }

  downloadTemplate(template: EventTemplate): void {
    this.target.target().pipe(concatMap(target => {
      const url = `targets/${encodeURIComponent(target.connectUrl)}/templates/${encodeURIComponent(template.name)}/type/${encodeURIComponent(template.type)}`;
      return this.sendRequest('v1', url)
        .pipe(concatMap(resp => resp.text()));
    }))
    .subscribe(resp => {
      this.downloadFile(
        `${template.name}.jfc`,
        resp,
        'application/jfc+xml')
    });
  }

  uploadRecording(file: File, signal?: AbortSignal): Observable<string> {
    window.onbeforeunload = () => true;
    return this.login.getHeaders().pipe(
      concatMap(headers => {
        const body = new window.FormData();
        body.append('recording', file);
        return fromFetch(`${this.login.authority}/api/v1/recordings`, {
          credentials: 'include',
          mode: 'cors',
          method: 'POST',
          body,
          headers,
          selector: response => response.text(),
          signal,
        });
      }),
      tap({
        next: () => window.onbeforeunload = null,
        error: () => window.onbeforeunload = null,
      }),
    );
  }

  uploadSSLCertificate(file: File): Observable<string> {
    const body = new window.FormData();
    body.append('cert', file);
    return this.sendRequest('v2', 'certificates', {
      method: 'POST',
      body,
    })
    .pipe(
      concatMap(resp => {
        if (resp.ok) {
          this.notifications.success("Successfully uploaded certificate");
          return from(resp.text());
        }
        throw resp.statusText;
      }),
    );
  }

  private sendRequest(apiVersion: ApiVersion, path: string, config?: RequestInit): Observable<Response> {
    const req = () => this.login.getHeaders().pipe(
      concatMap(headers => {
        return fromFetch(`${this.login.authority}/api/${apiVersion}/${path}`, {
          credentials: 'include',
          mode: 'cors',
          headers,
          ...config,
        });
      }),
      map(resp => {
        if (resp.ok) return resp;
        throw new HttpError(resp);
      }),
      catchError(err => this.handleError<Response>(err, req)),
    );
    return req();
  }

  private downloadFile(filename: string, data: BlobPart, type: string): void {
    const blob = new window.Blob([ data ], { type } );
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = url;
    anchor.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url));
  }

  private handleError<T>(error: Error, retry: () => Observable<T>): ObservableInput<T> {
    if (isHttpError(error)) {
      if (error.httpResponse.status === 427) {
        const jmxAuthScheme = error.httpResponse.headers.get('X-JMX-Authenticate');
        if (jmxAuthScheme === AuthMethod.BASIC) {
          this.target.setAuthFailure();
          return this.target.authRetry().pipe(
            mergeMap(() => retry())
          );
        }
      } else if (error.httpResponse.status === 502) {
        this.target.setSslFailure();
      } else {
        error.httpResponse.text().then(detail => {
          this.notifications.danger(`Request failed (${error.httpResponse.status} ${error.message})`, detail);
        });
      }
      throw error;
    }
    this.notifications.danger(`Request failed`, error.message);
    throw error;
  }

}

export interface SavedRecording {
  name: string;
  downloadUrl: string;
  reportUrl: string;
}

export interface Recording extends SavedRecording {
  id: number;
  state: RecordingState;
  duration: number;
  startTime: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}

export enum RecordingState {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
}

export const isActiveRecording = (toCheck: SavedRecording): toCheck is Recording => {
  return (toCheck as Recording).state !== undefined;
}

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
  type: 'CUSTOM' | 'TARGET';
}

export interface RecordingOptions {
  toDisk?: boolean;
  maxSize?: number;
  maxAge?: number;
}

export interface RecordingAttributes {
  name: string;
  events: string;
  duration?: number;
  options?: RecordingOptions;
}
