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
import { from, Observable, ObservableInput, of, ReplaySubject, forkJoin, throwError, EMPTY, shareReplay } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, concatMap, filter, first, map, mergeMap, tap } from 'rxjs/operators';
import { NO_TARGET, Target, TargetService } from './Target.service';
import { Notifications } from '@app/Notifications/Notifications';
import { AuthMethod, LoginService, SessionState } from './Login.service';
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { Rule } from '@app/Rules/Rules';
import { NotificationCategory } from './NotificationChannel.service';
import _ from 'lodash';
import { createBlobURL } from '@app/utils/utils';

type ApiVersion = 'v1' | 'v2' | 'v2.1' | 'v2.2' | 'beta';

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
};

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
    login
      .getSessionState()
      .pipe(
        concatMap((sessionState) => (sessionState === SessionState.USER_SESSION ? this.doGet('recordings') : EMPTY))
      )
      .subscribe({
        next: () => {
          this.archiveEnabled.next(true);
        },
        error: () => {
          this.archiveEnabled.next(false);
        },
      });

    const getDatasourceURL = fromFetch(`${this.login.authority}/api/v1/grafana_datasource_url`).pipe(
      concatMap((resp) => from(resp.json()))
    );
    const getDashboardURL = fromFetch(`${this.login.authority}/api/v1/grafana_dashboard_url`).pipe(
      concatMap((resp) => from(resp.json()))
    );
    const health = fromFetch(`${this.login.authority}/health`).pipe(
      tap((resp: Response) => {
        if (!resp.ok) {
          window.console.error(resp);
          this.notifications.danger('API /health request failed', resp.statusText);
        }
      }),
      concatMap((resp: Response) => from(resp.json())),
      shareReplay()
    );
    health.subscribe((jsonResp: any) => {
      this.cryostatVersionSubject.next(jsonResp.cryostatVersion);
    });
    health
      .pipe(
        concatMap((jsonResp: any) => {
          const toFetch: Observable<any>[] = [];
          const unconfigured: string[] = [];
          const unavailable: string[] = [];
          // if datasource or dashboard are not configured, display a warning
          // if either is configured but not available, display an error
          // if both configured and available then display nothing and just retrieve the URLs
          if (jsonResp.datasourceConfigured) {
            if (jsonResp.datasourceAvailable) {
              toFetch.push(getDatasourceURL);
            } else {
              unavailable.push('datasource URL');
            }
          } else {
            unconfigured.push('datasource URL');
          }
          if (jsonResp.dashboardConfigured) {
            if (jsonResp.dashboardAvailable) {
              toFetch.push(getDashboardURL);
            } else {
              unavailable.push('dashboard URL');
            }
          } else {
            unconfigured.push('dashboard URL');
          }
          if (unconfigured.length > 0) {
            return throwError(() => ({
              state: 'not configured',
              message: unconfigured.join(', ') + ' unconfigured',
            }));
          }
          if (unavailable.length > 0) {
            return throwError(() => ({
              state: 'unavailable',
              message: unavailable.join(', ') + ' unavailable',
            }));
          }
          return forkJoin(toFetch);
        })
      )
      .subscribe({
        next: (parts: any) => {
          this.grafanaDatasourceUrlSubject.next(parts[0].grafanaDatasourceUrl);
          this.grafanaDashboardUrlSubject.next(parts[1].grafanaDashboardUrl);
        },
        error: (err) => {
          window.console.error(err);
          if (err.state === 'unavailable') {
            this.notifications.danger(`Grafana ${err.state}`, err.message, NotificationCategory.GrafanaConfiguration);
          } else {
            this.notifications.warning(`Grafana ${err.state}`, err.message, NotificationCategory.GrafanaConfiguration);
          }
        },
      });
  }

  createTarget(target: Target): Observable<boolean> {
    const form = new window.FormData();
    form.append('connectUrl', target.connectUrl);
    if (!!target.alias && !!target.alias.trim()) {
      form.append('alias', target.alias);
    }
    return this.sendRequest('v2', `targets`, {
      method: 'POST',
      body: form,
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  deleteTarget(target: Target): Observable<boolean> {
    return this.sendRequest('v2', `targets/${encodeURIComponent(target.connectUrl)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  createRule(rule: Rule): Observable<boolean> {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    return this.sendRequest('v2', 'rules', {
      method: 'POST',
      body: JSON.stringify(rule),
      headers,
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  updateRule(rule: Rule): Observable<boolean> {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    return this.sendRequest('v2', `rules/${rule.name}`, {
      method: 'PATCH',
      body: JSON.stringify(rule),
      headers,
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  deleteRule(name: string, clean: boolean = true): Observable<boolean> {
    return this.sendRequest('v2', `rules/${name}?clean=${clean}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  createRecording(recordingAttributes: RecordingAttributes): Observable<boolean> {
    const form = new window.FormData();
    form.append('recordingName', recordingAttributes.name);
    form.append('events', recordingAttributes.events);
    if (!!recordingAttributes.duration && recordingAttributes.duration > 0) {
      form.append('duration', String(recordingAttributes.duration));
    }
    form.append('archiveOnStop', String(recordingAttributes.archiveOnStop));
    if (!!recordingAttributes.options) {
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
    if (!!recordingAttributes.metadata) {
      form.append('metadata', JSON.stringify(recordingAttributes.metadata));
    }

    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest('v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings`, {
          method: 'POST',
          body: form,
        }).pipe(
          map((resp) => resp.ok),
          first()
        )
      )
    );
  }

  createSnapshot(): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest('v1', `targets/${encodeURIComponent(target.connectUrl)}/snapshot`, {
          method: 'POST',
        }).pipe(
          tap((resp) => {
            if (resp.status == 202) {
              this.notifications.warning(
                'Snapshot Failed to Create',
                'The resultant recording was unreadable for some reason, likely due to a lack of Active, non-Snapshot source recordings to take event data from'
              );
            }
          }),
          map((resp) => resp.status == 200),
          first()
        )
      )
    );
  }

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable();
  }

  archiveRecording(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'v1',
          `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}`,
          {
            method: 'PATCH',
            body: 'SAVE',
          }
        ).pipe(
          map((resp) => resp.ok),
          first()
        )
      )
    );
  }

  stopRecording(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'v1',
          `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}`,
          {
            method: 'PATCH',
            body: 'STOP',
          }
        ).pipe(
          map((resp) => resp.ok),
          first()
        )
      )
    );
  }

  deleteRecording(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'v1',
          `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}`,
          {
            method: 'DELETE',
          }
        ).pipe(
          map((resp) => resp.ok),
          first()
        )
      )
    );
  }

  deleteArchivedRecording(connectUrl: string, recordingName: string): Observable<boolean> {
    return this.sendRequest(
      'beta',
      `recordings/${encodeURIComponent(connectUrl)}/${encodeURIComponent(recordingName)}`,
      {
        method: 'DELETE',
      }
    ).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  uploadActiveRecordingToGrafana(recordingName: string): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'v1',
          `targets/${encodeURIComponent(target.connectUrl)}/recordings/${encodeURIComponent(recordingName)}/upload`,
          {
            method: 'POST',
          }
        ).pipe(
          map((resp) => resp.ok),
          first()
        )
      )
    );
  }

  uploadArchivedRecordingToGrafana(sourceTarget: Observable<Target>, recordingName: string): Observable<boolean> {
    return sourceTarget.pipe(
      concatMap((target) =>
        this.sendRequest(
          'beta',
          `recordings/${encodeURIComponent(target.connectUrl)}/${encodeURIComponent(recordingName)}/upload`,
          {
            method: 'POST',
          }
        ).pipe(
          map((resp) => resp.ok),
          first()
        )
      )
    );
  }

  // from file system path functions
  uploadArchivedRecordingToGrafanaFromPath(subdirectoryName: string, recordingName: string): Observable<boolean> {
    return this.sendRequest('beta', `fs/recordings/${subdirectoryName}/${encodeURIComponent(recordingName)}/upload`, {
      method: 'POST',
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }
  deleteArchivedRecordingFromPath(subdirectoryName: string, recordingName: string): Observable<boolean> {
    return this.sendRequest('beta', `fs/recordings/${subdirectoryName}/${encodeURIComponent(recordingName)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  transformAndStringifyToRawLabels(labels: RecordingLabel[]) {
    const rawLabels = {};
    for (const label of labels) {
      rawLabels[label.key] = label.value;
    }
    return JSON.stringify(rawLabels);
  }

  postRecordingMetadataFromPath(
    subdirectoryName: string,
    recordingName: string,
    labels: RecordingLabel[]
  ): Observable<boolean> {
    return this.sendRequest(
      'beta',
      `fs/recordings/${subdirectoryName}/${encodeURIComponent(recordingName)}/metadata/labels`,
      {
        method: 'POST',
        body: this.transformAndStringifyToRawLabels(labels),
      }
    ).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  isProbeEnabled(): Observable<boolean> {
    return this.getActiveProbes(true).pipe(
      concatMap((_) => of(true)),
      catchError((_) => of(false))
    );
  }

  deleteCustomEventTemplate(templateName: string): Observable<boolean> {
    return this.sendRequest('v1', `templates/${encodeURIComponent(templateName)}`, {
      method: 'DELETE',
      body: null,
    }).pipe(
      map((response) => {
        if (!response.ok) {
          throw response.statusText;
        }
        return true;
      }),
      catchError((): ObservableInput<boolean> => of(false))
    );
  }

  addCustomEventTemplate(file: File): Observable<boolean> {
    const body = new window.FormData();
    body.append('template', file);
    return this.sendRequest('v1', `templates`, {
      method: 'POST',
      body,
    }).pipe(
      map((response) => {
        if (!response.ok) {
          throw response.statusText;
        }
        return true;
      }),
      catchError((): ObservableInput<boolean> => of(false))
    );
  }

  removeProbes(): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest('v2', `targets/${encodeURIComponent(target.connectUrl)}/probes`, {
          method: 'DELETE',
        }).pipe(
          tap((resp) => {
            if (resp.status == 400) {
              this.notifications.warning('Failed to remove Probes', 'The probes failed to be removed from the target');
            }
          }),
          map((resp) => resp.status == 200),
          first()
        )
      )
    );
  }

  insertProbes(templateName: string): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'v2',
          `targets/${encodeURIComponent(target.connectUrl)}/probes/${encodeURIComponent(templateName)}`,
          {
            method: 'POST',
          }
        ).pipe(
          tap((resp) => {
            if (resp.status == 400) {
              this.notifications.warning(
                'Failed to insert Probes',
                'The probes failed to be injected. Check that the agent is present in the same container as the target JVM and the target is running with -javaagent:/path/to/agent'
              );
            }
          }),
          map((resp) => resp.status == 200),
          first()
        )
      )
    );
  }

  addCustomProbeTemplate(file: File): Observable<boolean> {
    const body = new window.FormData();
    body.append('probeTemplate', file);
    return this.sendRequest('v2', `probes/` + file.name, {
      method: 'POST',
      body,
    }).pipe(
      map((response) => {
        if (!response.ok) {
          throw response.statusText;
        }
        return true;
      }),
      catchError((): ObservableInput<boolean> => of(false))
    );
  }

  deleteCustomProbeTemplate(templateName: string): Observable<boolean> {
    return this.sendRequest('v2', `probes/${encodeURIComponent(templateName)}`, {
      method: 'DELETE',
      body: null,
    }).pipe(
      map((response) => {
        if (!response.ok) {
          throw response.statusText;
        }
        return true;
      }),
      catchError((): ObservableInput<boolean> => of(false))
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

  doGet<T>(path: string, apiVersion: ApiVersion = 'v1'): Observable<T> {
    return this.sendRequest(apiVersion, path, { method: 'GET' }).pipe(
      map((resp) => resp.json()),
      concatMap(from),
      first()
    );
  }

  getProbeTemplates(): Observable<ProbeTemplate[]> {
    return this.sendRequest('v2', 'probes', { method: 'GET' }).pipe(
      concatMap((resp) => resp.json()),
      map((response: ProbeTemplateResponse) => response.data.result),
      first()
    );
  }

  getActiveProbes(suppressNotifications = false): Observable<EventProbe[]> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'v2',
          `targets/${encodeURIComponent(target.connectUrl)}/probes`,
          {
            method: 'GET',
          },
          suppressNotifications
        ).pipe(
          concatMap((resp) => resp.json()),
          map((response: EventProbesResponse) => response.data.result),
          first()
        )
      )
    );
  }

  graphql<T>(query: string, variables?: Object): Observable<T> {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    return this.sendRequest('v2.2', 'graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: query.replace(/[\s]+/g, ' '),
        variables,
      }),
      headers,
    }).pipe(
      map((resp) => resp.json()),
      concatMap(from),
      first()
    );
  }

  downloadReport(recording: Recording): void {
    const body = new window.FormData();
    if (isActiveRecording(recording)) {
      body.append('resource', recording.reportUrl.replace('/api/v1', '/api/v2.1'));
    } else {
      body.append('resource', recording.reportUrl.concat('/jwt'));
    }
    this.sendRequest('v2.1', 'auth/token', {
      method: 'POST',
      body,
    })
      .pipe(
        concatMap((resp) => resp.json()),
        map((response: AssetJwtResponse) => response.data.result.resourceUrl)
      )
      .subscribe((resourceUrl) => {
        this.downloadFile(resourceUrl, `${recording.name}.report.html`, false);
      });
  }

  downloadRecording(recording: Recording): void {
    const body = new window.FormData();
    if (isActiveRecording(recording)) {
      body.append('resource', recording.downloadUrl.replace('/api/v1', '/api/v2.1'));
    } else {
      body.append('resource', recording.downloadUrl.concat('/jwt'));
    }
    this.sendRequest('v2.1', 'auth/token', {
      method: 'POST',
      body,
    })
      .pipe(
        concatMap((resp) => resp.json()),
        map((response: AssetJwtResponse) => response.data.result.resourceUrl)
      )
      .subscribe((resourceUrl) => {
        this.downloadFile(resourceUrl, recording.name + (recording.name.endsWith('.jfr') ? '' : '.jfr'));
        this.downloadFile(
          createBlobURL(JSON.stringify(recording.metadata), 'application/json'), // Blob for metadata
          recording.name.replace(/\.jfr$/, '') + '.metadata.json'
        );
      });
  }

  downloadTemplate(template: EventTemplate): void {
    this.target
      .target()
      .pipe(
        first(),
        map(
          (target) =>
            `${this.login.authority}/api/v2.1/targets/${encodeURIComponent(
              target.connectUrl
            )}/templates/${encodeURIComponent(template.name)}/type/${encodeURIComponent(template.type)}`
        )
      )
      .subscribe((resource) => {
        const body = new window.FormData();
        body.append('resource', resource);
        this.sendRequest('v2.1', 'auth/token', {
          method: 'POST',
          body,
        })
          .pipe(
            concatMap((resp) => resp.json()),
            map((response: AssetJwtResponse) => response.data.result.resourceUrl)
          )
          .subscribe((resourceUrl) => {
            this.downloadFile(resourceUrl, `${template.name}.jfc`);
          });
      });
  }

  downloadRule(name: string): void {
    this.doGet<any>('rules/' + name, 'v2')
      .pipe(
        first(),
        map((resp) => resp.data.result)
      )
      .subscribe((rule) => {
        const filename = `${rule.name}.json`;
        const file = new File([JSON.stringify(rule)], filename);
        const resourceUrl = URL.createObjectURL(file);
        this.downloadFile(resourceUrl, filename);
        setTimeout(() => URL.revokeObjectURL(resourceUrl), 1000);
      });
  }

  uploadRecording(file: File, labels: Object, signal?: AbortSignal): Observable<string> {
    window.onbeforeunload = () => true;
    return this.login.getHeaders().pipe(
      concatMap((headers) => {
        const body = new window.FormData();
        body.append('recording', file);
        body.append('labels', JSON.stringify(labels));

        return fromFetch(`${this.login.authority}/api/v1/recordings`, {
          credentials: 'include',
          mode: 'cors',
          method: 'POST',
          body,
          headers,
          signal,
        });
      }),
      concatMap((v) => {
        if (v.ok) {
          return from(v.text());
        }
        throw from(v.text());
      }),
      tap({
        next: () => (window.onbeforeunload = null),
        error: (err) => {
          window.onbeforeunload = null;
          err.subscribe((msg) =>
            this.notifications.danger('Upload Failed', msg, NotificationCategory.ArchivedRecordingCreated)
          );
        },
        complete: () => (window.onbeforeunload = null),
      })
    );
  }

  uploadSSLCertificate(file: File): Observable<string> {
    const body = new window.FormData();
    body.append('cert', file);
    return this.sendRequest('v2', 'certificates', {
      method: 'POST',
      body,
    }).pipe(
      concatMap((resp) => {
        if (resp.ok) {
          this.notifications.success('Successfully uploaded certificate');
          return from(resp.text());
        }
        throw resp.statusText;
      })
    );
  }

  postRecordingMetadata(recordingName: string, labels: RecordingLabel[]): Observable<ArchivedRecording[]> {
    return this.target.target().pipe(
      filter((target) => target !== NO_TARGET),
      first(),
      concatMap((target) =>
        this.graphql<any>(
          `
        query PostRecordingMetadata($connectUrl: String, $recordingName: String, $labels: String) {
          targetNodes(filter: { name: $connectUrl }) {
            recordings {
              archived(filter: { name: $recordingName }) {
                data {
                  doPutMetadata(metadata: { labels: $labels }) {
                    metadata {
                      labels
                    }
                  }
                }
              }
            }
          }
        }`,
          { connectUrl: target.connectUrl, recordingName, labels: this.stringifyRecordingLabels(labels) }
        )
      ),
      map((v) => v.data.targetNodes[0].recordings.archived as ArchivedRecording[])
    );
  }

  postUploadedRecordingMetadata(recordingName: string, labels: RecordingLabel[]): Observable<ArchivedRecording[]> {
    return this.graphql<any>(
      `
      query PostUploadedRecordingMetadata($connectUrl: String, $recordingName: String, $labels: String){
        archivedRecordings(filter: {sourceTarget: $connectUrl, name: $recordingName }) {
          data {
            doPutMetadata(metadata: { labels: $labels }) {
              metadata {
                labels
              }
            }
          }
        }
      }`,
      { connectUrl: UPLOADS_SUBDIRECTORY, recordingName, labels: this.stringifyRecordingLabels(labels) }
    ).pipe(map((v) => v.data.archivedRecordings.data as ArchivedRecording[]));
  }

  postTargetRecordingMetadata(recordingName: string, labels: RecordingLabel[]): Observable<ActiveRecording[]> {
    return this.target.target().pipe(
      filter((target) => target !== NO_TARGET),
      first(),
      concatMap((target) =>
        this.graphql<any>(
          `
        query PostActiveRecordingMetadata($connectUrl: String, $recordingName: String, $labels: String) {
          targetNodes(filter: { name: $connectUrl }) {
            recordings {
              active(filter: { name: $recordingName }) {
                data {
                  doPutMetadata(metadata: { labels: $labels }) {
                    metadata {
                      labels
                    }
                  }
                }
              }
            }
          }
        }`,
          { connectUrl: target.connectUrl, recordingName, labels: this.stringifyRecordingLabels(labels) }
        )
      ),
      map((v) => v.data.targetNodes[0].recordings.active as ActiveRecording[])
    );
  }

  postCredentials(matchExpression: string, username: string, password: string): Observable<boolean> {
    const body = new window.FormData();
    body.append('matchExpression', matchExpression);
    body.append('username', username);
    body.append('password', password);

    return this.sendRequest('v2.2', 'credentials', {
      method: 'POST',
      body,
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  getCredential(id: number): Observable<MatchedCredential> {
    return this.sendRequest('v2.2', `credentials/${id}`, {
      method: 'GET',
    }).pipe(
      concatMap((resp) => resp.json()),
      map((response: CredentialResponse) => response.data.result),
      first()
    );
  }

  getCredentials(): Observable<StoredCredential[]> {
    return this.sendRequest('v2.2', `credentials`, {
      method: 'GET',
    }).pipe(
      concatMap((resp) => resp.json()),
      map((response: CredentialsResponse) => response.data.result),
      first()
    );
  }

  deleteCredentials(id: number): Observable<boolean> {
    return this.sendRequest('v2.2', `credentials/${id}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first()
    );
  }

  private sendRequest(
    apiVersion: ApiVersion,
    path: string,
    config?: RequestInit,
    suppressNotifications = false
  ): Observable<Response> {
    const req = () =>
      this.login.getHeaders().pipe(
        concatMap((headers) => {
          const defaultReq = {
            credentials: 'include',
            mode: 'cors',
            headers: headers,
          } as RequestInit;

          function customizer(dest, src) {
            if (dest instanceof Headers && src instanceof Headers) {
              src.forEach((v, k) => dest.set(k, v));
            }
            return dest;
          }

          _.mergeWith(config, defaultReq, customizer);

          return fromFetch(`${this.login.authority}/api/${apiVersion}/${path}`, config);
        }),
        map((resp) => {
          if (resp.ok) return resp;
          throw new HttpError(resp);
        }),
        catchError((err) => this.handleError<Response>(err, req, suppressNotifications))
      );
    return req();
  }

  private downloadFile(url: string, filename: string, download = true): void {
    const anchor = document.createElement('a');
    anchor.setAttribute('style', 'display: none; visibility: hidden;');
    anchor.target = '_blank';
    if (download) {
      anchor.download = filename;
    }
    anchor.href = url;
    anchor.click();
    anchor.remove();
  }

  private handleError<T>(error: Error, retry: () => Observable<T>, suppressNotifications = false): ObservableInput<T> {
    if (isHttpError(error)) {
      if (error.httpResponse.status === 427) {
        const jmxAuthScheme = error.httpResponse.headers.get('X-JMX-Authenticate');
        if (jmxAuthScheme === AuthMethod.BASIC) {
          this.target.setAuthFailure();
          return this.target.authRetry().pipe(mergeMap(() => retry()));
        }
      } else if (error.httpResponse.status === 502) {
        this.target.setSslFailure();
      } else {
        error.httpResponse.text().then((detail) => {
          if (!suppressNotifications) {
            this.notifications.danger(`Request failed (${error.httpResponse.status} ${error.message})`, detail);
          }
        });
      }
      throw error;
    }
    if (!suppressNotifications) {
      this.notifications.danger(`Request failed`, error.message);
    }
    throw error;
  }

  private stringifyRecordingLabels(labels: RecordingLabel[]): string {
    return JSON.stringify(labels).replace(/"([^"]+)":/g, '$1:');
  }
}

export interface AllArchivesResponse {}

export interface ApiV2Response {
  meta: {
    status: string;
    type: string;
  };
  data: Object;
}

interface AssetJwtResponse extends ApiV2Response {
  data: {
    result: {
      resourceUrl: string;
    };
  };
}

interface CredentialResponse extends ApiV2Response {
  data: {
    result: MatchedCredential;
  };
}

interface ProbeTemplateResponse extends ApiV2Response {
  data: {
    result: ProbeTemplate[];
  };
}

interface EventProbesResponse extends ApiV2Response {
  data: {
    result: EventProbe[];
  };
}

interface CredentialsResponse extends ApiV2Response {
  data: {
    result: StoredCredential[];
  };
}

export interface RecordingDirectory {
  connectUrl: string;
  jvmId: string;
  recordings: ArchivedRecording[];
}

export interface ArchivedRecording {
  name: string;
  downloadUrl: string;
  reportUrl: string;
  metadata: Metadata;
  size: number;
}

export interface ActiveRecording extends Omit<ArchivedRecording, 'size'> {
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
export type Recording = ActiveRecording | ArchivedRecording;

export const isActiveRecording = (toCheck: Recording): toCheck is ActiveRecording => {
  return (toCheck as ActiveRecording).state !== undefined;
};

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
  archiveOnStop?: boolean;
  options?: RecordingOptions;
  metadata?: Metadata;
}

export interface Metadata {
  labels: Object;
}

export interface StoredCredential {
  id: number;
  matchExpression: string;
  numMatchingTargets: number;
}

export interface ProbeTemplate {
  name: string;
  xml: string;
}

export interface EventProbe {
  id: string;
  name: string;
  clazz: string;
  description: string;
  path: string;
  recordStackTrace: boolean;
  useRethrow: boolean;
  methodName: string;
  methodDescriptor: string;
  location: string;
  returnValue: string;
  parameters: string;
  fields: string;
}

export interface MatchedCredential {
  matchExpression: string;
  targets: Target[];
}

// New target specific archived recording apis now enforce a non-empty target field
// The placeholder targetId for uploaded (non-target) recordings is "uploads"
export const UPLOADS_SUBDIRECTORY: string = 'uploads';
