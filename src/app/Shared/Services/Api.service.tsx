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
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { LayoutTemplate, SerialLayoutTemplate } from '@app/Dashboard/dashboard-utils';
import { EventType } from '@app/Events/EventTypes';
import { Notifications } from '@app/Notifications/Notifications';
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { Rule } from '@app/Rules/Rules';
import { EnvironmentNode } from '@app/Topology/typings';
import { createBlobURL, jvmIdToSubdirectoryName } from '@app/utils/utils';
import { ValidatedOptions } from '@patternfly/react-core';
import _ from 'lodash';
import { EMPTY, forkJoin, from, Observable, ObservableInput, of, ReplaySubject, shareReplay, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, concatMap, filter, first, map, mergeMap, tap } from 'rxjs/operators';
import { AuthMethod, LoginService, SessionState } from './Login.service';
import { NotificationCategory } from './NotificationChannel.service';
import { NO_TARGET, Target, TargetService, includesTarget } from './Target.service';

type ApiVersion = 'v1' | 'v2' | 'v2.1' | 'v2.2' | 'beta';

export class HttpError extends Error {
  readonly httpResponse: Response;

  constructor(httpResponse: Response) {
    super(httpResponse.statusText);
    this.httpResponse = httpResponse;
  }
}

export class XMLHttpError extends Error {
  readonly xmlHttpResponse: XMLHttpResponse;

  constructor(xmlHttpResponse: XMLHttpResponse) {
    super(xmlHttpResponse.statusText);
    this.xmlHttpResponse = xmlHttpResponse;
  }
}

export const isHttpError = (err: unknown): err is HttpError => {
  if (!(err instanceof Error)) {
    return false;
  }
  return (err as HttpError).httpResponse !== undefined;
};

export const isXMLHttpError = (err: unknown): err is XMLHttpError => {
  if (!(err instanceof Error)) {
    return false;
  }
  return (err as XMLHttpError).xmlHttpResponse !== undefined;
};

export const isHttpOk = (statusCode: number) => {
  return statusCode >= 200 && statusCode < 300;
};

export class ApiService {
  private readonly archiveEnabled = new ReplaySubject<boolean>(1);
  private readonly cryostatVersionSubject = new ReplaySubject<string>(1);
  private readonly grafanaDatasourceUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDashboardUrlSubject = new ReplaySubject<string>(1);

  constructor(
    private readonly target: TargetService,
    private readonly notifications: Notifications,
    private readonly login: LoginService,
  ) {
    // show recording archives when recordings available
    this.login
      .getSessionState()
      .pipe(
        concatMap((sessionState) => (sessionState === SessionState.USER_SESSION ? this.doGet('recordings') : EMPTY)),
      )
      .subscribe({
        next: () => {
          this.archiveEnabled.next(true);
        },
        error: () => {
          this.archiveEnabled.next(false);
        },
      });

    const getDatasourceURL: Observable<GrafanaDatasourceUrlGetResponse> = fromFetch(
      `${this.login.authority}/api/v1/grafana_datasource_url`,
    ).pipe(concatMap((resp) => from(resp.json())));
    const getDashboardURL: Observable<GrafanaDashboardUrlGetResponse> = fromFetch(
      `${this.login.authority}/api/v1/grafana_dashboard_url`,
    ).pipe(concatMap((resp) => from(resp.json())));
    const health: Observable<HealthGetResponse> = fromFetch(`${this.login.authority}/health`).pipe(
      tap((resp: Response) => {
        if (!resp.ok) {
          window.console.error(resp);
          this.notifications.danger('API /health request failed', resp.statusText);
        }
      }),
      concatMap((resp: Response) => from(resp.json())),
      shareReplay(),
    );
    health
      .pipe(
        concatMap((jsonResp) => {
          this.cryostatVersionSubject.next(jsonResp.cryostatVersion);
          const toFetch: unknown[] = [];
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
          return forkJoin(
            toFetch as [Observable<GrafanaDatasourceUrlGetResponse>, Observable<GrafanaDashboardUrlGetResponse>],
          );
        }),
      )
      .subscribe({
        next: (parts) => {
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

  createTarget(
    target: Target,
    credentials?: { username?: string; password?: string },
    storeCredentials = false,
    dryrun = false,
  ): Observable<{ status: number; body: object }> {
    const form = new window.FormData();
    form.append('connectUrl', target.connectUrl);
    if (target.alias && target.alias.trim()) {
      form.append('alias', target.alias);
    }
    credentials?.username && form.append('username', credentials.username);
    credentials?.password && form.append('password', credentials.password);
    return this.sendRequest(
      'v2',
      `targets`,
      {
        method: 'POST',
        body: form,
      },
      new URLSearchParams({ storeCredentials: `${storeCredentials}`, dryrun: `${dryrun}` }),
      true,
      true,
    ).pipe(
      first(),
      concatMap((resp) => resp.json().then((body) => ({ status: resp.status, body: body as object }))),
      catchError((err: Error) => {
        if (isHttpError(err)) {
          return from(
            err.httpResponse.json().then((body) => ({ status: err.httpResponse.status, body: body as object })),
          );
        }
        return of({ status: 0, body: { data: { reason: err.message } } }); // Status 0 -> request is not completed
      }),
    );
  }

  deleteTarget(target: Target): Observable<boolean> {
    return this.sendRequest('v2', `targets/${encodeURIComponent(target.connectUrl)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      catchError(() => of(false)),
      first(),
    );
  }

  uploadRule(
    rule: Rule,
    onUploadProgress?: (progress: string | number) => void,
    abortSignal?: Observable<void>,
  ): Observable<boolean> {
    window.onbeforeunload = (event: BeforeUnloadEvent) => event.preventDefault();

    const headers = {};
    headers['Content-Type'] = 'application/json';
    return this.sendLegacyRequest('v2', 'rules', {
      method: 'POST',
      body: JSON.stringify(rule),
      headers: headers,
      listeners: {
        onUploadProgress: (event) => {
          onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
        },
      },
      abortSignal,
    }).pipe(
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
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
      catchError((_) => of(false)),
      first(),
    );
  }

  updateRule(rule: Rule, clean = true): Observable<boolean> {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    return this.sendRequest(
      'v2',
      `rules/${rule.name}`,
      {
        method: 'PATCH',
        body: JSON.stringify(rule),
        headers,
      },
      new URLSearchParams({ clean: String(clean) }),
    ).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  deleteRule(name: string, clean = true): Observable<boolean> {
    return this.sendRequest(
      'v2',
      `rules/${name}`,
      {
        method: 'DELETE',
      },
      new URLSearchParams({ clean: String(clean) }),
    ).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  createRecording(recordingAttributes: RecordingAttributes): Observable<SimpleResponse | undefined> {
    const form = new window.FormData();
    form.append('recordingName', recordingAttributes.name);
    form.append('events', recordingAttributes.events);
    if (!!recordingAttributes.duration && recordingAttributes.duration > 0) {
      form.append('duration', String(recordingAttributes.duration));
    }
    if (recordingAttributes.archiveOnStop != null) {
      form.append('archiveOnStop', String(recordingAttributes.archiveOnStop));
    }
    if (recordingAttributes.options) {
      if (recordingAttributes.options.restart) {
        form.append('restart', String(recordingAttributes.options.restart));
      }
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
    if (recordingAttributes.metadata) {
      form.append('metadata', JSON.stringify(recordingAttributes.metadata));
    }

    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest('v1', `targets/${encodeURIComponent(target.connectUrl)}/recordings`, {
          method: 'POST',
          body: form,
        }).pipe(
          map((resp) => {
            return {
              ok: resp.ok,
              status: resp.status,
            };
          }),
          catchError((err) => {
            if (isHttpError(err)) {
              return of({
                ok: false,
                status: err.httpResponse.status,
              });
            } else {
              return of(undefined);
            }
          }),
          first(),
        ),
      ),
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
                'The recording is not readable for reasons, such as, unavailability of active and non-snapshot source recordings from where the event data is read.',
              );
            }
          }),
          map((resp) => resp.status == 200),
          catchError((_) => of(false)),
          first(),
        ),
      ),
    );
  }

  createSnapshotV2(): Observable<ActiveRecording | undefined> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest('v2', `targets/${encodeURIComponent(target.connectUrl)}/snapshot`, {
          method: 'POST',
        }).pipe(
          concatMap((resp) => resp.json() as Promise<RecordingResponse>),
          map((response) => response.data.result),
          catchError((_) => of(undefined)),
          first(),
        ),
      ),
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
          },
        ).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
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
          },
        ).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
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
          },
        ).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
    );
  }

  deleteArchivedRecording(connectUrl: string, recordingName: string): Observable<boolean> {
    return this.sendRequest(
      'beta',
      `recordings/${encodeURIComponent(connectUrl)}/${encodeURIComponent(recordingName)}`,
      {
        method: 'DELETE',
      },
    ).pipe(
      map((resp) => resp.ok),
      first(),
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
          },
        ).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
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
          },
        ).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
    );
  }

  // from file system path functions
  uploadArchivedRecordingToGrafanaFromPath(jvmId: string, recordingName: string): Observable<boolean> {
    const subdirectoryName = jvmIdToSubdirectoryName(jvmId);
    return this.sendRequest('beta', `fs/recordings/${subdirectoryName}/${encodeURIComponent(recordingName)}/upload`, {
      method: 'POST',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }
  deleteArchivedRecordingFromPath(jvmId: string, recordingName: string): Observable<boolean> {
    const subdirectoryName = jvmIdToSubdirectoryName(jvmId);
    return this.sendRequest('beta', `fs/recordings/${subdirectoryName}/${encodeURIComponent(recordingName)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  transformAndStringifyToRawLabels(labels: RecordingLabel[]) {
    const rawLabels = {};
    for (const label of labels) {
      rawLabels[label.key] = label.value;
    }
    return JSON.stringify(rawLabels);
  }

  postRecordingMetadataFromPath(jvmId: string, recordingName: string, labels: RecordingLabel[]): Observable<boolean> {
    const subdirectoryName = jvmIdToSubdirectoryName(jvmId);
    return this.sendRequest(
      'beta',
      `fs/recordings/${subdirectoryName}/${encodeURIComponent(recordingName)}/metadata/labels`,
      {
        method: 'POST',
        body: this.transformAndStringifyToRawLabels(labels),
      },
    ).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  isProbeEnabled(): Observable<boolean> {
    return this.getActiveProbes(true).pipe(
      concatMap((_) => of(true)),
      catchError((_) => of(false)),
      first(),
    );
  }

  deleteCustomEventTemplate(templateName: string): Observable<boolean> {
    return this.sendRequest('v1', `templates/${encodeURIComponent(templateName)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      catchError(() => of(false)),
      first(),
    );
  }

  addCustomEventTemplate(
    file: File,
    onUploadProgress?: (progress: string | number) => void,
    abortSignal?: Observable<void>,
  ): Observable<boolean> {
    window.onbeforeunload = (event: BeforeUnloadEvent) => event.preventDefault();

    const body = new window.FormData();
    body.append('template', file);
    return this.sendLegacyRequest('v1', 'templates', {
      body: body,
      method: 'POST',
      headers: {},
      listeners: {
        onUploadProgress: (event) => {
          onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
        },
      },
      abortSignal,
    }).pipe(
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
    );
  }

  removeProbes(): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest('v2', `targets/${encodeURIComponent(target.connectUrl)}/probes`, {
          method: 'DELETE',
        }).pipe(
          map((resp) => resp.ok),
          catchError(() => of(false)),
          first(),
        ),
      ),
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
          },
        ).pipe(
          tap((resp) => {
            if (resp.status == 400) {
              this.notifications.warning(
                'Failed to insert Probes',
                'The probes failed to be injected. Check that the agent is present in the same container as the target JVM and the target is running with -javaagent:/path/to/agent',
              );
            }
          }),
          map((resp) => resp.ok),
          catchError((_) => of(false)),
          first(),
        ),
      ),
    );
  }

  addCustomProbeTemplate(
    file: File,
    onUploadProgress?: (progress: string | number) => void,
    abortSignal?: Observable<void>,
  ): Observable<boolean> {
    window.onbeforeunload = (event: BeforeUnloadEvent) => event.preventDefault();

    const body = new window.FormData();
    body.append('probeTemplate', file);
    return this.sendLegacyRequest('v2', `probes/${file.name}`, {
      method: 'POST',
      body: body,
      headers: {},
      listeners: {
        onUploadProgress: (event) => {
          onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
        },
      },
      abortSignal,
    }).pipe(
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
    );
  }

  deleteCustomProbeTemplate(templateName: string): Observable<boolean> {
    return this.sendRequest('v2', `probes/${encodeURIComponent(templateName)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      catchError(() => of(false)),
      first(),
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

  doGet<T>(
    path: string,
    apiVersion: ApiVersion = 'v1',
    params?: URLSearchParams,
    suppressNotifications?: boolean,
    skipStatusCheck?: boolean,
  ): Observable<T> {
    return this.sendRequest(apiVersion, path, { method: 'GET' }, params, suppressNotifications, skipStatusCheck).pipe(
      map((resp) => resp.json()),
      concatMap(from),
      first(),
    );
  }

  getProbeTemplates(): Observable<ProbeTemplate[]> {
    return this.sendRequest('v2', 'probes', { method: 'GET' }).pipe(
      concatMap((resp) => resp.json()),
      map((response: ProbeTemplateResponse) => response.data.result),
      first(),
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
          undefined,
          suppressNotifications,
        ).pipe(
          concatMap((resp) => resp.json()),
          map((response: EventProbesResponse) => response.data.result),
          first(),
        ),
      ),
    );
  }

  getActiveProbesForTarget(
    target: Target,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<EventProbe[]> {
    return this.sendRequest(
      'v2',
      `targets/${encodeURIComponent(target.connectUrl)}/probes`,
      {
        method: 'GET',
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      concatMap((resp) => resp.json()),
      map((response: EventProbesResponse) => response.data.result),
      first(),
    );
  }

  graphql<T>(
    query: string,
    variables?: unknown,
    suppressNotifications?: boolean,
    skipStatusCheck?: boolean,
  ): Observable<T> {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    return this.sendRequest(
      'v2.2',
      'graphql',
      {
        method: 'POST',
        body: JSON.stringify({
          query: query.replace(/[\s]+/g, ' '),
          variables,
        }),
        headers,
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      map((resp) => resp.json()),
      concatMap(from),
      first(),
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
        map((response: AssetJwtResponse) => response.data.result.resourceUrl),
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
        map((response: AssetJwtResponse) => response.data.result.resourceUrl),
      )
      .subscribe((resourceUrl) => {
        this.downloadFile(resourceUrl, recording.name + (recording.name.endsWith('.jfr') ? '' : '.jfr'));
        this.downloadFile(
          createBlobURL(JSON.stringify(recording.metadata), 'application/json'), // Blob for metadata
          recording.name.replace(/\.jfr$/, '') + '.metadata.json',
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
              target.connectUrl,
            )}/templates/${encodeURIComponent(template.name)}/type/${encodeURIComponent(template.type)}`,
        ),
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
            map((response: AssetJwtResponse) => response.data.result.resourceUrl),
          )
          .subscribe((resourceUrl) => {
            this.downloadFile(resourceUrl, `${template.name}.jfc`);
          });
      });
  }

  downloadRule(name: string): void {
    this.doGet<RuleResponse>('rules/' + name, 'v2')
      .pipe(
        first(),
        map((resp) => resp.data.result),
      )
      .subscribe((rule) => {
        const filename = `${rule.name}.json`;
        const file = new File([JSON.stringify(rule)], filename);
        const resourceUrl = URL.createObjectURL(file);
        this.downloadFile(resourceUrl, filename);
        setTimeout(() => URL.revokeObjectURL(resourceUrl), 1000);
      });
  }

  uploadRecording(
    file: File,
    labels: object,
    onUploadProgress?: (progress: number) => void,
    abortSignal?: Observable<void>,
  ): Observable<string> {
    window.onbeforeunload = (event: BeforeUnloadEvent) => event.preventDefault();

    const body = new window.FormData();
    body.append('recording', file);
    body.append('labels', JSON.stringify(labels));

    return this.sendLegacyRequest('v1', 'recordings', {
      method: 'POST',
      body: body,
      headers: {},
      listeners: {
        onUploadProgress: (event) => {
          onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
        },
      },
      abortSignal,
    }).pipe(
      map((resp) => {
        if (resp.ok) {
          return resp.body as string;
        }
        throw new XMLHttpError(resp);
      }),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
    );
  }

  uploadSSLCertificate(
    file: File,
    onUploadProgress?: (progress: number) => void,
    abortSignal?: Observable<void>,
  ): Observable<boolean> {
    window.onbeforeunload = (event: BeforeUnloadEvent) => event.preventDefault();

    const body = new window.FormData();
    body.append('cert', file);
    return this.sendLegacyRequest('v2', 'certificates', {
      method: 'POST',
      body,
      headers: {},
      listeners: {
        onUploadProgress: (event) => {
          onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
        },
      },
      abortSignal,
    }).pipe(
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
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
          { connectUrl: target.connectUrl, recordingName, labels: this.stringifyRecordingLabels(labels) },
        ),
      ),
      map((v) => v.data.targetNodes[0].recordings.archived as ArchivedRecording[]),
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
      { connectUrl: UPLOADS_SUBDIRECTORY, recordingName, labels: this.stringifyRecordingLabels(labels) },
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
          { connectUrl: target.connectUrl, recordingName, labels: this.stringifyRecordingLabels(labels) },
        ),
      ),
      map((v) => v.data.targetNodes[0].recordings.active as ActiveRecording[]),
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
      catchError((_) => of(false)),
      first(),
    );
  }

  getCredential(id: number): Observable<MatchedCredential> {
    return this.sendRequest('v2.2', `credentials/${id}`, {
      method: 'GET',
    }).pipe(
      concatMap((resp) => resp.json()),
      map((response: CredentialResponse) => response.data.result),
      first(),
    );
  }

  getCredentials(suppressNotifications = false, skipStatusCheck = false): Observable<StoredCredential[]> {
    return this.sendRequest(
      'v2.2',
      `credentials`,
      {
        method: 'GET',
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      concatMap((resp) => resp.json()),
      map((response: CredentialsResponse) => response.data.result),
      first(),
    );
  }

  deleteCredentials(id: number): Observable<boolean> {
    return this.sendRequest('v2.2', `credentials/${id}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  getRules(suppressNotifications = false, skipStatusCheck = false): Observable<Rule[]> {
    return this.sendRequest(
      'v2',
      'rules',
      {
        method: 'GET',
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      concatMap((resp) => resp.json()),
      map((response: RulesResponse) => response.data.result),
      first(),
    );
  }

  getDiscoveryTree(): Observable<EnvironmentNode> {
    return this.sendRequest('v2.1', 'discovery', {
      method: 'GET',
    }).pipe(
      concatMap((resp) => resp.json()),
      map((body: DiscoveryResponse) => body.data.result),
      first(),
    );
  }

  // Filter targets that the expression matches
  matchTargetsWithExpr(matchExpression: string, targets: Target[]): Observable<Target[]> {
    const body = JSON.stringify({
      matchExpression,
      targets,
    });
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    return this.sendRequest(
      'beta',
      'matchExpressions',
      {
        method: 'POST',
        body,
        headers,
      },
      undefined,
      true,
      true,
    ).pipe(
      first(),
      concatMap((resp: Response) => resp.json()),
      map((body): Target[] => body.data.result.targets || []),
    );
  }

  isTargetMatched(matchExpression: string, target: Target): Observable<boolean> {
    return this.matchTargetsWithExpr(matchExpression, [target]).pipe(
      first(),
      map((ts) => includesTarget(ts, target)),
      catchError((_) => of(false)),
    );
  }

  groupHasRecording(group: EnvironmentNode, filter: ActiveRecordingFilterInput): Observable<boolean> {
    return this.graphql<any>(
      `
    query GetRecordingForGroup ($groupFilter: EnvironmentNodeFilterInput, $recordingFilter: ActiveRecordingFilterInput){
      environmentNodes(filter: $groupFilter) {
        name
        descendantTargets {
          name
          recordings {
              active(filter: $recordingFilter) {
                  data {
                    name
                  }
              }
          }
        }
      }
    }
    `,
      {
        groupFilter: { id: group.id },
        recordingFilter: filter,
      },
    ).pipe(
      first(),
      map((body) =>
        body.data.environmentNodes[0].descendantTargets.reduce(
          (acc: Partial<ActiveRecording>[], curr) => acc.concat(curr.recordings?.active?.data || []),
          [] as Partial<ActiveRecording>[],
        ),
      ),
      catchError((_) => of([])),
      map((recs: Partial<ActiveRecording>[]) => recs.length > 0), // At least one
    );
  }

  targetHasRecording(target: Target, filter: ActiveRecordingFilterInput = {}): Observable<boolean> {
    return this.graphql<RecordingCountResponse>(
      `
        query ActiveRecordingsForJFRMetrics($connectUrl: String, $recordingFilter: ActiveRecordingFilterInput) {
          targetNodes(filter: { name: $connectUrl }) {
            recordings {
              active (filter: $recordingFilter) {
                aggregate {
                  count
                }
              }
            }
          }
        }`,
      {
        connectUrl: target.connectUrl,
        recordingFilter: filter,
      },
      true,
      true,
    ).pipe(
      map((resp) => {
        const nodes = resp.data.targetNodes;
        if (nodes.length === 0) {
          return false;
        }
        const count = nodes[0].recordings.active.aggregate.count;
        return count > 0;
      }),
      catchError((_) => of(false)),
    );
  }

  checkCredentialForTarget(
    target: Target,
    credentials: { username: string; password: string },
  ): Observable<
    | {
        error: Error;
        severeLevel: ValidatedOptions;
      }
    | undefined
  > {
    const body = new window.FormData();
    body.append('username', credentials.username);
    body.append('password', credentials.password);

    return this.sendRequest(
      'beta',
      `credentials/${encodeURIComponent(target.connectUrl)}`,
      { method: 'POST', body },
      undefined,
      true,
      true,
    ).pipe(
      first(),
      concatMap((resp) => resp.json()),
      map((body) => {
        const result: string | undefined = body?.data?.result;
        switch (result?.toUpperCase()) {
          case 'FAILURE':
            return { error: new Error('Invalid username or password.'), severeLevel: ValidatedOptions.error };
          case 'NA':
            return {
              error: new Error('The target does not have authentication enabled.'),
              severeLevel: ValidatedOptions.warning,
            };
          case 'SUCCESS':
            return undefined;
          default:
            return {
              error: new Error('Could not determine test results. Try again!'),
              severeLevel: ValidatedOptions.error,
            };
        }
      }),
      catchError((err) => {
        if (isHttpError(err)) {
          return err.httpResponse
            .text()
            .then((detail) => ({ error: new Error(detail), severeLevel: ValidatedOptions.error }));
        }
        return of({ error: err, severeLevel: ValidatedOptions.error });
      }),
    );
  }

  getTargetMBeanMetrics(target: Target, queries: string[]): Observable<MBeanMetrics> {
    return this.graphql<MBeanMetricsResponse>(
      `
        query MBeanMXMetricsForTarget($connectUrl: String) {
          targetNodes(filter: { name: $connectUrl }) {
            mbeanMetrics {
              ${queries.join('\n')}
            }
          }
        }`,
      { connectUrl: target.connectUrl },
    ).pipe(
      map((resp) => {
        const nodes = resp.data.targetNodes;
        if (!nodes || nodes.length === 0) {
          return {};
        }
        return nodes[0]?.mbeanMetrics;
      }),
      catchError((_) => of({})),
    );
  }

  getTargetArchivedRecordings(target: Target): Observable<ArchivedRecording[]> {
    return this.graphql<any>(
      `
          query ArchivedRecordingsForTarget($connectUrl: String) {
            archivedRecordings(filter: { sourceTarget: $connectUrl }) {
              data {
                name
                downloadUrl
                reportUrl
                metadata {
                  labels
                }
                size
                archivedTime
              }
            }
          }`,
      { connectUrl: target.connectUrl },
      true,
      true,
    ).pipe(map((v) => v.data.archivedRecordings.data as ArchivedRecording[]));
  }

  getTargetActiveRecordings(target: Target): Observable<ActiveRecording[]> {
    return this.doGet<ActiveRecording[]>(
      `targets/${encodeURIComponent(target.connectUrl)}/recordings`,
      'v1',
      undefined,
      true,
      true,
    );
  }

  getTargetEventTemplates(target: Target): Observable<EventTemplate[]> {
    return this.doGet<EventTemplate[]>(
      `targets/${encodeURIComponent(target.connectUrl)}/templates`,
      'v1',
      undefined,
      true,
      true,
    );
  }

  getTargetEventTypes(target: Target): Observable<EventType[]> {
    return this.doGet<EventType[]>(
      `targets/${encodeURIComponent(target.connectUrl)}/events`,
      'v1',
      undefined,
      true,
      true,
    );
  }

  downloadLayoutTemplate(template: LayoutTemplate): void {
    const stringifiedSerializedLayout = this.stringifyLayoutTemplate(template);
    const filename = `cryostat-dashboard-${template.name}.json`;
    const resourceUrl = createBlobURL(stringifiedSerializedLayout, 'application/json');
    this.downloadFile(resourceUrl, filename);
  }

  private stringifyLayoutTemplate(template: LayoutTemplate): string {
    const download = {
      name: template.name,
      description: template.description,
      cards: template.cards,
      version: template.version,
    } as SerialLayoutTemplate;
    return JSON.stringify(download);
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

  stringifyRecordingLabels(labels: RecordingLabel[]): string {
    return JSON.stringify(labels).replace(/"([^"]+)":/g, '$1:');
  }

  private sendRequest(
    apiVersion: ApiVersion,
    path: string,
    config?: RequestInit,
    params?: URLSearchParams,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<Response> {
    const req = () =>
      this.login.getHeaders().pipe(
        concatMap((headers) => {
          const defaultReq = {
            credentials: 'include',
            mode: 'cors',
            headers: headers,
          } as RequestInit;

          const customizer = (dest: any, src: any) => {
            if (dest instanceof Headers && src instanceof Headers) {
              src.forEach((v, k) => dest.set(k, v));
            }
            return dest;
          };

          _.mergeWith(config, defaultReq, customizer);
          return fromFetch(`${this.login.authority}/api/${apiVersion}/${path}${params ? '?' + params : ''}`, config);
        }),
        map((resp) => {
          if (resp.ok) return resp;
          throw new HttpError(resp);
        }),
        catchError((err) => {
          if (skipStatusCheck) {
            throw err;
          }
          return this.handleError<Response>(err, req, suppressNotifications);
        }),
      );
    return req();
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

  private sendLegacyRequest(
    // Used for uploading. Prefer sendRequest for other operations
    apiVersion: ApiVersion,
    path: string,
    { method = 'GET', body, headers = {}, listeners, abortSignal }: XMLHttpRequestConfig,
    params?: URLSearchParams,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<XMLHttpResponse> {
    const req = () =>
      this.login.getHeaders().pipe(
        concatMap((defaultHeaders) => {
          return from(
            new Promise<XMLHttpResponse>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open(method, `${this.login.authority}/api/${apiVersion}/${path}${params ? '?' + params : ''}`, true);

              listeners?.onUploadProgress && xhr.upload.addEventListener('progress', listeners.onUploadProgress);

              abortSignal && abortSignal.subscribe(() => xhr.abort()); // Listen to abort signal if any

              xhr.addEventListener('readystatechange', () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                  if (xhr.status === 0) {
                    // aborted
                    reject(new Error('Aborted'));
                  }
                  const ok = isHttpOk(xhr.status);
                  const respHeaders = {};
                  const arr = xhr
                    .getAllResponseHeaders()
                    .trim()
                    .split(/[\r\n]+/);
                  arr.forEach((line) => {
                    const parts = line.split(': ');
                    const header = parts.shift();
                    const value = parts.join(': ');
                    if (header) {
                      respHeaders[header] = value;
                    } else {
                      reject(new Error('Invalid header'));
                    }
                  });

                  resolve({
                    body: xhr.response,
                    headers: respHeaders,
                    respType: xhr.responseType,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    ok: ok,
                  } as XMLHttpResponse);
                }
              });

              // Populate headers
              defaultHeaders.forEach((v, k) => xhr.setRequestHeader(k, v));
              headers && Object.keys(headers).forEach((k) => xhr.setRequestHeader(k, headers[k]));
              xhr.withCredentials = true;

              // Send request
              xhr.send(body);
            }),
          );
        }),
        map((resp) => {
          if (resp.ok) return resp;
          throw new XMLHttpError(resp);
        }),
        catchError((err) => {
          if (skipStatusCheck) {
            throw err;
          }
          return this.handleLegacyError<XMLHttpResponse>(err, req, suppressNotifications);
        }),
      );
    return req();
  }

  private handleLegacyError<T>(
    error: Error,
    retry: () => Observable<T>,
    suppressNotifications = false,
  ): ObservableInput<T> {
    if (isXMLHttpError(error)) {
      if (error.xmlHttpResponse.status === 427) {
        const jmxAuthScheme = error.xmlHttpResponse.headers['X-JMX-Authenticate'];
        if (jmxAuthScheme === AuthMethod.BASIC) {
          this.target.setAuthFailure();
          return this.target.authRetry().pipe(mergeMap(() => retry()));
        }
      } else if (error.xmlHttpResponse.status === 502) {
        this.target.setSslFailure();
      } else {
        Promise.resolve(error.xmlHttpResponse.body as string).then((detail) => {
          if (!suppressNotifications) {
            this.notifications.danger(`Request failed (${error.xmlHttpResponse.status} ${error.message})`, detail);
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
}

export type SimpleResponse = Pick<Response, 'ok' | 'status'>;

export interface ApiV2Response {
  meta: {
    status: string;
    type: string;
  };
  data: object;
}

interface AssetJwtResponse extends ApiV2Response {
  data: {
    result: {
      resourceUrl: string;
    };
  };
}

interface RecordingResponse extends ApiV2Response {
  data: {
    result: ActiveRecording;
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

interface RuleResponse extends ApiV2Response {
  data: {
    result: Rule;
  };
}

interface RulesResponse extends ApiV2Response {
  data: {
    result: Rule[];
  };
}

interface DiscoveryResponse extends ApiV2Response {
  data: {
    result: EnvironmentNode;
  };
}

interface RecordingCountResponse {
  data: {
    targetNodes: {
      recordings: {
        active: {
          aggregate: {
            count: number;
          };
        };
      };
    }[];
  };
}

interface XMLHttpResponse {
  body: any;
  headers: object;
  respType: XMLHttpRequestResponseType;
  status: number;
  statusText: string;
  ok: boolean;
  text: () => Promise<string>;
}

interface XMLHttpRequestConfig {
  body?: XMLHttpRequestBodyInit;
  headers: object;
  method: string;
  listeners?: {
    onUploadProgress?: (e: ProgressEvent) => void;
  };
  abortSignal?: Observable<void>;
}

interface GrafanaDashboardUrlGetResponse {
  grafanaDashboardUrl: string;
}

interface GrafanaDatasourceUrlGetResponse {
  grafanaDatasourceUrl: string;
}

interface HealthGetResponse {
  // TODO: update HTTP_API.md v1/HealthGetHandler to include cryostatVersion
  cryostatVersion: string;
  datasourceConfigured: boolean;
  datasourceAvailable: boolean;
  dashboardConfigured: boolean;
  dashboardAvailable: boolean;
  reportsConfigured: boolean;
  reportsAvailable: boolean;
}

export interface MemoryUsage {
  init: number;
  used: number;
  committed: number;
  max: number;
}

export interface MBeanMetrics {
  thread?: {
    threadCount?: number;
    daemonThreadCount?: number;
  };
  os?: {
    arch?: string;
    availableProcessors?: number;
    version?: string;
    systemCpuLoad?: number;
    systemLoadAverage?: number;
    processCpuLoad?: number;
    totalPhysicalMemorySize?: number;
    freePhysicalMemorySize?: number;
    totalSwapSpaceSize: number;
  };
  memory?: {
    heapMemoryUsage?: MemoryUsage;
    nonHeapMemoryUsage?: MemoryUsage;
    heapMemoryUsagePercent?: number;
  };
  runtime?: {
    bootClassPath?: string;
    classPath?: string;
    inputArguments?: string[];
    libraryPath?: string;
    managementSpecVersion?: string;
    name?: string;
    specName?: string;
    specVendor?: string;
    startTime?: number;
    // systemProperties?: Object
    uptime?: number;
    vmName?: string;
    vmVendor?: string;
    vmVersion?: string;
    bootClassPathSupported?: boolean;
  };
}

export interface MBeanMetricsResponse {
  data: {
    targetNodes: {
      mbeanMetrics: MBeanMetrics;
    }[];
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
  archivedTime: number;
}

export interface ActiveRecording extends Omit<ArchivedRecording, 'size' | 'archivedTime'> {
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

export const isGraphQLAuthError = (resp: any): boolean => {
  if (resp.errors !== undefined) {
    if (resp.errors[0].message.includes('Authentication failed!')) {
      return true;
    }
  }
  return false;
};

export type TemplateType = 'TARGET' | 'CUSTOM';

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
  type: TemplateType;
}

export interface RecordingOptions {
  restart?: boolean;
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
  labels: object;
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

export interface ActiveRecordingFilterInput {
  name?: string;
  state?: string;
  continuous?: boolean;
  toDisk?: boolean;
  durationMsGreaterThanEqual?: number;
  durationMsLessThanEqual?: number;
  startTimeMsBeforeEqual?: number;
  startTimeMsAfterEqual?: number;
  labels?: string[] | string;
}

export const automatedAnalysisRecordingName = 'automated-analysis';

export interface AutomatedAnalysisRecordingConfig {
  template: Pick<EventTemplate, 'name' | 'type'>;
  maxSize: number;
  maxAge: number;
}

export const defaultAutomatedAnalysisRecordingConfig: AutomatedAnalysisRecordingConfig = {
  template: {
    name: 'Continuous',
    type: 'TARGET',
  },
  maxSize: 1048576,
  maxAge: 0,
};

export interface ChartControllerConfig {
  minRefresh: number;
}

export const defaultChartControllerConfig: ChartControllerConfig = {
  minRefresh: 10,
};

// New target specific archived recording apis now enforce a non-empty target field
// The placeholder targetId for uploaded (non-target) recordings is "uploads"
export const UPLOADS_SUBDIRECTORY = 'uploads';
