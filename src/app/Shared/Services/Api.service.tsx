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

import { LayoutTemplate, SerialLayoutTemplate } from '@app/Dashboard/types';
import { createBlobURL } from '@app/utils/utils';
import { ValidatedOptions } from '@patternfly/react-core';
import _ from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  forkJoin,
  from,
  Observable,
  ObservableInput,
  of,
  ReplaySubject,
  throwError,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, concatMap, filter, first, map, mergeMap, tap } from 'rxjs/operators';
import {
  GrafanaDatasourceUrlGetResponse,
  GrafanaDashboardUrlGetResponse,
  HealthGetResponse,
  Target,
  Rule,
  RecordingAttributes,
  ActiveRecording,
  ApiVersion,
  ProbeTemplate,
  EventProbe,
  Recording,
  EventTemplate,
  ArchivedRecording,
  UPLOADS_SUBDIRECTORY,
  MatchedCredential,
  EnvironmentNode,
  ActiveRecordingsFilterInput,
  RecordingCountResponse,
  MBeanMetrics,
  EventType,
  NotificationCategory,
  HttpError,
  SimpleResponse,
  XMLHttpError,
  XMLHttpRequestConfig,
  XMLHttpResponse,
  KeyValue,
  TargetStub,
  TargetForTest,
  Metadata,
  TargetMetadata,
  isTargetMetadata,
  MBeanMetricsResponse,
  BuildInfo,
  AggregateReport,
  HeapDump,
  ThreadDump,
  SmartTrigger,
  AsyncProfilerStatus,
  AsyncProfile,
} from './api.types';
import {
  isHttpError,
  includesTarget,
  isHttpOk,
  isXMLHttpError,
  isGraphQLAuthError,
  isGraphQLSSLError,
  isGraphQLError,
  GraphQLError,
} from './api.utils';
import { NotificationService } from './Notifications.service';
import { CryostatContext } from './Services';
import { TargetService } from './Target.service';

export class ApiService {
  private readonly archiveEnabled = new BehaviorSubject<boolean>(true);
  private readonly cryostatVersionSubject = new ReplaySubject<string>(1);
  private readonly buildInfoSubject = new ReplaySubject<BuildInfo>(1);
  private readonly grafanaDatasourceUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDashboardUrlSubject = new ReplaySubject<string>(1);

  constructor(
    private readonly ctx: CryostatContext,
    private readonly target: TargetService,
    private readonly notifications: NotificationService,
  ) {}

  testBaseServer() {
    this.testHealth();
    this.testArchiveAvailability();
  }

  private testHealth() {
    const datasourceURL: Observable<GrafanaDashboardUrlGetResponse> = this.doGet('/grafana_datasource_url', 'v4');
    const dashboardURL: Observable<GrafanaDashboardUrlGetResponse> = this.doGet('/grafana_dashboard_url', 'v4');
    const health: Observable<HealthGetResponse> = this.doGet('/health', 'unversioned');

    health
      .pipe(
        concatMap((jsonResp) => {
          this.cryostatVersionSubject.next(jsonResp.cryostatVersion);
          this.buildInfoSubject.next(jsonResp.build);
          const toFetch: unknown[] = [];
          const unconfigured: string[] = [];
          const unavailable: string[] = [];
          // if datasource or dashboard are not configured, display a warning
          // if either is configured but not available, display an error
          // if both configured and available then display nothing and just retrieve the URLs
          if (jsonResp.datasourceConfigured) {
            if (jsonResp.datasourceAvailable) {
              toFetch.push(datasourceURL);
            } else {
              unavailable.push('datasource URL');
            }
          } else {
            unconfigured.push('datasource URL');
          }
          if (jsonResp.dashboardConfigured) {
            if (jsonResp.dashboardAvailable) {
              toFetch.push(dashboardURL);
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

  private testArchiveAvailability() {
    this.doGet('recordings')
      .pipe(
        catchError(() => {
          this.archiveEnabled.next(false);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  getTargets(): Observable<Target[]> {
    return this.doGet('targets', 'v4');
  }

  createTarget(
    target: TargetStub,
    credentials?: { username?: string; password?: string },
    storeCredentials = false,
    dryrun = false,
  ): Observable<boolean> {
    const form = new window.FormData();
    form.append('connectUrl', target.connectUrl);
    if (target.alias && target.alias.trim()) {
      form.append('alias', target.alias);
    }
    credentials?.username && form.append('username', credentials.username);
    credentials?.password && form.append('password', credentials.password);
    return this.sendRequest(
      'v4',
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
      map((resp) => resp.ok),
      catchError((_) => {
        return of(false);
      }),
    );
  }

  deleteTarget(target: TargetStub): Observable<boolean> {
    return this.sendRequest('v4', `targets/${target.id}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      catchError(() => of(false)),
      first(),
    );
  }

  getTargetTriggers(
    target: TargetStub,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<SmartTrigger[]> {
    return this.doGet(`targets/${target.id}/smart_triggers`, 'beta', undefined, suppressNotifications, skipStatusCheck);
  }

  deleteTrigger(uuid: string, target: TargetStub): Observable<boolean> {
    return this.sendRequest('beta', `targets/${target.id}/smart_triggers/${uuid}`, { method: 'DELETE' }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  addTriggers(definition: string, target: TargetStub): Observable<boolean> {
    const body = new window.FormData();
    body.append('definition', String(definition));
    return this.sendRequest('beta', `targets/${target.id}/smart_triggers/`, { method: 'POST', body }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  uploadRule(
    rule: Rule,
    onUploadProgress?: (progress: string | number) => void,
    abortSignal?: Observable<void>,
  ): Observable<boolean> {
    const body = new window.FormData();
    Object.entries(rule).forEach((e) => {
      if (!e || !e[0] || !e[1]) {
        return;
      }
      if (e[0] === 'metadata') {
        const labels = {};
        e[1].labels.forEach((kv: KeyValue) => {
          labels[kv.key] = kv.value;
        });
        body.append(e[0], JSON.stringify({ labels }));
      } else {
        body.append(e[0], e[1]);
      }
    });
    window.onbeforeunload = (event: BeforeUnloadEvent) => event.preventDefault();
    return this.ctx.headers().pipe(
      concatMap((headers) =>
        this.sendLegacyRequest('v4', 'rules', 'Rule Upload Failed', {
          body,
          method: 'POST',
          headers,
          listeners: {
            onUploadProgress: (event) => {
              onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
            },
          },
          abortSignal,
        }),
      ),
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
    );
  }

  createRule(rule: Rule): Observable<boolean> {
    return this.ctx
      .headers({
        'Content-Type': 'application/json',
      })
      .pipe(
        concatMap((headers) =>
          this.sendRequest('v4', 'rules', {
            method: 'POST',
            body: JSON.stringify({ ...rule, metadata: { labels: this.transformLabelsToObject(rule.metadata.labels) } }),
            headers,
          }),
        ),
        map((resp) => resp.ok),
        catchError((_) => of(false)),
        first(),
      );
  }

  updateRule(rule: Rule, clean = true): Observable<boolean> {
    return this.ctx
      .headers({
        'Content-Type': 'application/json',
      })
      .pipe(
        concatMap((headers) =>
          this.sendRequest(
            'v4',
            `rules/${rule.name}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                ...rule,
                metadata: {
                  labels: this.transformLabelsToObject(rule?.metadata?.labels ?? []),
                },
              }),
              headers,
            },
            new URLSearchParams({ clean: String(clean) }),
          ),
        ),

        map((resp) => resp.ok),
        first(),
      );
  }

  deleteRule(name: string, clean = true): Observable<boolean> {
    return this.sendRequest(
      'v4',
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

  createRecording({
    name,
    events,
    duration,
    replace,
    archiveOnStop,
    metadata,
    advancedOptions,
  }: RecordingAttributes): Observable<SimpleResponse | undefined> {
    const form = new window.FormData();
    form.append('recordingName', name);
    form.append('events', events);
    if (duration && duration > 0) {
      form.append('duration', String(duration));
    }
    if (archiveOnStop != undefined) {
      form.append('archiveOnStop', String(archiveOnStop));
    }
    if (metadata) {
      form.append('metadata', JSON.stringify(this.transformMetadataToObject(metadata)));
    }
    if (replace != undefined) {
      form.append('replace', String(replace));
    }
    if (advancedOptions) {
      if (advancedOptions.toDisk != undefined) {
        form.append('toDisk', String(advancedOptions.toDisk));
      }
      if (advancedOptions.maxAge && advancedOptions.maxAge >= 0) {
        form.append('maxAge', String(advancedOptions.maxAge));
      }
      if (advancedOptions.maxSize && advancedOptions.maxSize >= 0) {
        form.append('maxSize', String(advancedOptions.maxSize));
      }
    }

    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/recordings`, {
          method: 'POST',
          body: form,
        }).pipe(
          map((resp) => ({
            ok: resp.ok,
            status: resp.status,
          })),
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
      first(),
    );
  }

  createSnapshot(): Observable<ActiveRecording | undefined> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/snapshot`, {
          method: 'POST',
        }).pipe(
          concatMap((resp) => (resp.status === 202 ? of(undefined) : (resp.json() as Promise<ActiveRecording>))),
          catchError((_) => of(undefined)),
          first(),
        ),
      ),
      first(),
    );
  }

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable();
  }

  archiveRecording(remoteId: number): Observable<string> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/recordings/${remoteId}`, {
          method: 'PATCH',
          body: 'SAVE',
        }).pipe(
          concatMap((resp) => resp.text()),
          first(),
        ),
      ),
      first(),
    );
  }

  stopRecording(remoteId: number): Observable<boolean> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/recordings/${remoteId}`, {
          method: 'PATCH',
          body: 'STOP',
        }).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
      first(),
    );
  }

  deleteRecording(remoteId: number): Observable<boolean> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/recordings/${remoteId}`, {
          method: 'DELETE',
        }).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
      first(),
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

  uploadActiveRecordingToGrafana(remoteId: number): Observable<string> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/recordings/${remoteId}/upload`, {
          method: 'POST',
        }).pipe(
          concatMap((resp) => resp.text()),
          first(),
        ),
      ),
      first(),
    );
  }

  uploadArchivedRecordingToGrafana(
    sourceTarget: Observable<Target | undefined>,
    recordingName: string,
  ): Observable<string> {
    return sourceTarget.pipe(
      concatMap((target) =>
        this.sendRequest('v4', `grafana/${window.btoa((target!.jvmId ?? 'uploads') + '/' + recordingName)}`, {
          method: 'POST',
        }).pipe(
          concatMap((resp) => resp.text()),
          first(),
        ),
      ),
      first(),
    );
  }

  // from file system path functions
  uploadArchivedRecordingToGrafanaFromPath(jvmId: string, recordingName: string): Observable<string> {
    return this.sendRequest('v4', `grafana/${window.btoa((jvmId ?? 'uploads') + '/' + recordingName)}`, {
      method: 'POST',
    }).pipe(
      concatMap((resp) => resp.text()),
      first(),
    );
  }

  deleteArchivedRecordingFromPath(jvmId: string, recordingName: string): Observable<boolean> {
    return this.sendRequest('beta', `fs/recordings/${encodeURIComponent(jvmId)}/${encodeURIComponent(recordingName)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  // FIXME remove this, all API endpoints that allow us to send labels in the request body should accept it in as-is JSON form
  stringifyRecordingLabels(labels: KeyValue | KeyValue[]): string {
    return JSON.stringify(labels).replace(/"([^"]+)":/g, '$1:');
  }

  // FIXME remove this, all API endpoints that allow us to send labels in the request body should accept it in as-is JSON form
  transformAndStringifyToRawLabels(labels: KeyValue[]): string {
    const rawLabels = {};
    for (const label of labels) {
      rawLabels[label.key] = label.value;
    }
    return JSON.stringify(rawLabels);
  }

  transformMetadataToObject(metadata: Metadata | TargetMetadata): object {
    if (isTargetMetadata(metadata)) {
      return {
        labels: this.transformLabelsToObject(metadata.labels),
        annotations: {
          cryostat: this.transformLabelsToObject(metadata?.annotations?.cryostat),
          platform: this.transformLabelsToObject(metadata?.annotations?.platform),
        },
      };
    } else {
      return {
        labels: this.transformLabelsToObject(metadata.labels),
      };
    }
  }

  transformLabelsToObject(labels: KeyValue[]): object {
    const out = {};
    for (const label of labels) {
      out[label.key] = label.value;
    }
    return out;
  }

  postRecordingMetadataForJvmId(
    jvmId: string,
    recordingName: string,
    labels: KeyValue[],
  ): Observable<ArchivedRecording[]> {
    return this.graphql<any>(
      `
      query postRecordingMetadataForJvmId($jvmId: String!, $recordingName: String!, $labels: [Entry_String_StringInput]) {
        archivedRecordings(filter: {sourceTarget: $jvmId, name: $recordingName }) {
          data {
            doPutMetadata(metadataInput: { labels: $labels }) {
              metadata {
                labels {
                  key
                  value
                }
              }
              size
              archivedTime
            }
          }
        }
      }`,
      {
        jvmId,
        recordingName,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(map((v) => (v.data?.archivedRecordings?.data as ArchivedRecording[]) ?? []));
  }

  isProbeEnabled(): Observable<boolean> {
    return this.getActiveProbes(true).pipe(
      concatMap((_) => of(true)),
      catchError((_) => of(false)),
      first(),
    );
  }

  deleteCustomEventTemplate(templateName: string): Observable<boolean> {
    return this.sendRequest('v4', `event_templates/${encodeURIComponent(templateName)}`, {
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
    return this.ctx.headers().pipe(
      concatMap((headers) =>
        this.sendLegacyRequest('v4', 'event_templates', 'Template Upload Failed', {
          body: body,
          method: 'POST',
          headers,
          listeners: {
            onUploadProgress: (event) => {
              onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
            },
          },
          abortSignal,
        }),
      ),
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
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/probes`, {
          method: 'DELETE',
        }).pipe(
          map((resp) => resp.ok),
          catchError(() => of(false)),
          first(),
        ),
      ),
      first(),
    );
  }

  runGC(suppressNotifications = false): Observable<boolean> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'beta',
          `diagnostics/targets/${target?.id}/gc`,
          {
            method: 'POST',
          },
          undefined,
          suppressNotifications,
        ).pipe(
          map((resp) => resp.ok),
          first(),
        ),
      ),
      first(),
    );
  }

  runThreadDump(suppressNotifications = false): Observable<string> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'beta',
          `diagnostics/targets/${target?.id}/threaddump?format=threadPrint`,
          {
            method: 'POST',
          },
          undefined,
          suppressNotifications,
        ).pipe(
          concatMap((resp) => resp.text()),
          first(),
        ),
      ),
      first(),
    );
  }

  runHeapDump(suppressNotifications = false): Observable<string> {
    return this.target.target().pipe(
      concatMap((target) =>
        this.sendRequest(
          'beta',
          `diagnostics/targets/${target?.id}/heapdump`,
          {
            method: 'POST',
          },
          undefined,
          suppressNotifications,
        ).pipe(
          concatMap((resp) => resp.text()),
          first(),
        ),
      ),
      first(),
    );
  }

  deleteThreadDump(target: Target, threadDumpId: string): Observable<boolean> {
    return this.sendRequest('beta', `diagnostics/targets/${target?.id}/threaddump/${threadDumpId}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  deleteArchivedThreadDumpFromPath(jvmId: string, threadDumpId: string): Observable<boolean> {
    return this.sendRequest('beta', `diagnostics/fs/threaddumps/${jvmId}/${threadDumpId}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  deleteHeapDump(target: Target, heapDumpId: string): Observable<boolean> {
    return this.sendRequest('beta', `diagnostics/targets/${target?.id}/heapdump/${heapDumpId}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  deleteArchivedHeapDumpFromPath(jvmId: string, heapDumpId: string): Observable<boolean> {
    return this.sendRequest('beta', `diagnostics/fs/heapdumps/${jvmId}/${heapDumpId}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  getThreadDumps(suppressNotifications = false): Observable<ThreadDump[]> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest(
          'beta',
          `diagnostics/targets/${target!.id}/threaddump`,
          {
            method: 'GET',
          },
          undefined,
          suppressNotifications,
        ).pipe(
          concatMap((resp) => resp.json()),
          first(),
        ),
      ),
      first(),
    );
  }

  getHeapDumps(suppressNotifications = false): Observable<HeapDump[]> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest(
          'beta',
          `diagnostics/targets/${target!.id}/heapdump`,
          {
            method: 'GET',
          },
          undefined,
          suppressNotifications,
        ).pipe(
          concatMap((resp) => resp.json()),
          first(),
        ),
      ),
      first(),
    );
  }

  insertProbes(templateName: string): Observable<boolean> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest('v4', `targets/${target!.id}/probes/${encodeURIComponent(templateName)}`, {
          method: 'POST',
        }).pipe(
          tap((resp) => {
            if (resp.status == 400) {
              this.notifications.warning(
                'Failed to insert probes',
                'The probes failed to be injected. Check that the agent is present in the same container as the Target JVM and the target is running with -javaagent:/path/to/agent',
              );
            }
          }),
          map((resp) => resp.ok),
          catchError((_) => of(false)),
          first(),
        ),
      ),
      first(),
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
    body.append('name', file.name);
    return this.ctx.headers().pipe(
      concatMap((headers) =>
        this.sendLegacyRequest('v4', 'probes', 'Custom Probe Template Upload Failed', {
          method: 'POST',
          body: body,
          headers,
          listeners: {
            onUploadProgress: (event) => {
              onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
            },
          },
          abortSignal,
        }),
      ),
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
    );
  }

  deleteCustomProbeTemplate(templateName: string): Observable<boolean> {
    return this.sendRequest('v4', `probes/${encodeURIComponent(templateName)}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      catchError(() => of(false)),
      first(),
    );
  }

  downloadProbeTemplate(template: ProbeTemplate): void {
    this.ctx.url(`/api/v4/probes/${encodeURIComponent(template.name)}`).subscribe((resourceUrl) => {
      this.downloadFile(resourceUrl, undefined, template.name);
    });
  }

  cryostatVersion(): Observable<string> {
    return this.cryostatVersionSubject.asObservable();
  }

  buildInfo(): Observable<BuildInfo> {
    return this.buildInfoSubject.asObservable();
  }

  grafanaDatasourceUrl(): Observable<string> {
    return this.grafanaDatasourceUrlSubject.asObservable();
  }

  grafanaDashboardUrl(): Observable<string> {
    return this.grafanaDashboardUrlSubject.asObservable();
  }

  openGrafanaDashboard(openGrafana: string | boolean): void {
    let url: Observable<string>;
    if (openGrafana === true) {
      url = this.grafanaDashboardUrl();
    } else if (typeof openGrafana === 'string' && openGrafana) {
      url = of(openGrafana);
    } else {
      return;
    }
    url.subscribe((u) => window.open(u, '_blank'));
  }

  doGet<T>(
    path: string,
    apiVersion: ApiVersion = 'v4',
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
    return this.sendRequest('v4', 'probes', { method: 'GET' }).pipe(
      concatMap((resp) => resp.json()),
      first(),
    );
  }

  getActiveProbes(suppressNotifications = false): Observable<EventProbe[]> {
    return this.target.target().pipe(
      filter((t) => !!t),
      concatMap((target) =>
        this.sendRequest(
          'v4',
          `targets/${target!.id}/probes`,
          {
            method: 'GET',
          },
          undefined,
          suppressNotifications,
        ).pipe(
          concatMap((resp) => resp.json()),
          first(),
        ),
      ),
      first(),
    );
  }

  getActiveProbesForTarget(
    target: TargetStub,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<EventProbe[]> {
    return this.sendRequest(
      'v4',
      `targets/${target.id}/probes`,
      {
        method: 'GET',
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      concatMap((resp) => resp.json()),
      first(),
    );
  }

  getCurrentReportsForAllTargets(
    minScore = -1,
    // TODO refactor and define a named type for this return type
  ): Observable<{ target: Target; hasSources: boolean; report: AggregateReport }[]> {
    return this.graphql<any>(
      `
        query AggregateReportsForAllTargets {
          targetNodes {
            target {
              id
              jvmId
              agent
              connectUrl
              alias
              labels {
                key
                value
              }
              annotations {
                cryostat {
                  key
                  value
                }
                platform {
                  key
                  value
                }
              }
              activeRecordings {
                aggregate {
                  count
                }
              }
              report {
                lastUpdated
                aggregate {
                  count
                  max
                }
                data {
                  key
                  value {
                    name
                    topic
                    score
                    evaluation {
                      explanation
                      solution
                      summary
                      suggestions {
                        name
                        setting
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    ).pipe(
      map((resp) =>
        (resp.data?.targetNodes ?? [])
          .filter((n) => n.target.report.aggregate.max >= minScore)
          .sort((a, b) => b.target.report.aggregate.max - a.target.report.aggregate.max)
          .map((n) => ({
            target: {
              id: n.target.id,
              jvmId: n.target.jvmId,
              agent: n.target.agent,
              connectUrl: n.target.connectUrl,
              alias: n.target.alias,
              labels: n.target.labels,
              annotations: n.target.annotations,
            },
            hasSources: n.target.activeRecordings.aggregate.count > 0,
            report: n.target.report,
          })),
      ),
      map((a) => _.uniqWith(a, (a, b) => a.target.jvmId === b.target.jvmId)),
    );
  }

  getCurrentReportForTarget(
    target: TargetStub | TargetStub[],
    aggregateOnly = false,
    reportFilter = {},
  ): Observable<AggregateReport> {
    let targetIds: number[];
    if (Array.isArray(target)) {
      targetIds = target.map((t) => t.id!);
    } else {
      targetIds = [target.id!];
    }
    const dataQ = `
                data {
                  key
                  value {
                    name
                    topic
                    score
                    evaluation {
                      explanation
                      solution
                      summary
                      suggestions {
                        name
                        setting
                        value
                      }
                    }
                  }
                }
    `;
    return this.graphql<any>(
      `
        query AggregateReportForTarget($targetIds: [ BigInteger! ], $reportFilter: ReportFilterInput) {
          targetNodes(filter: { targetIds: $targetIds }) {
            target {
              id
              report(filter: $reportFilter) {
                lastUpdated
                aggregate {
                  count
                  max
                }
                ${aggregateOnly ? '' : dataQ}
              }
            }
          }
        }
      `,
      { targetIds, reportFilter },
    ).pipe(
      map((resp) => {
        const empty = {
          data: {},
          aggregate: {
            max: -1,
            count: 0,
          },
        };

        const nodes = resp.data?.targetNodes ?? [];
        if (nodes.length === 0) {
          return empty;
        }
        if (!nodes[0]?.target?.report?.aggregate?.count) {
          return empty;
        }
        return nodes[0].target.report;
      }),
    );
  }

  graphql<T>(
    query: string,
    variables?: unknown,
    suppressNotifications?: boolean,
    skipStatusCheck?: boolean,
  ): Observable<T> {
    const req = () =>
      this.ctx
        .headers({
          'Content-Type': 'application/json',
        })
        .pipe(
          concatMap((headers) =>
            this.sendRequest(
              'v4',
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
            ),
          ),
          map((resp) => resp.json()),
          concatMap(from),
          tap((resp) => {
            if (isGraphQLError(resp)) {
              this.handleError(new GraphQLError(resp.errors), req);
            }
          }),
          first(),
        );
    return req();
  }

  downloadRecording(recording: Recording): void {
    this.ctx.url(recording.downloadUrl).subscribe((resourceUrl) => {
      const jfrFilename = recording.name + (recording.name.endsWith('.jfr') ? '' : '.jfr');
      this.downloadFile(resourceUrl, new URLSearchParams({ filename: jfrFilename }), jfrFilename);

      const metadataUrl = createBlobURL(JSON.stringify(recording.metadata), 'application/json');
      this.downloadFile(metadataUrl, undefined, recording.name.replace(/\.jfr$/, '') + '.metadata.json', false);
      setTimeout(() => URL.revokeObjectURL(metadataUrl), 1000);
    });
  }

  downloadThreadDump(threadDump: ThreadDump): void {
    this.ctx.url(threadDump.downloadUrl).subscribe((resourceUrl) => {
      let filename = this.target.target().pipe(
        map((t) =>
          t
            ? `${t?.alias}_${threadDump.threadDumpId}.thread_dump`
            : `${threadDump.jvmId}_${threadDump.threadDumpId}.thread_dump`,
        ),
        first(),
      );
      filename.subscribe((name) => {
        this.downloadFile(resourceUrl, new URLSearchParams({ filename: name }), name);
      });
    });
  }

  downloadHeapDump(heapDump: HeapDump): void {
    this.ctx
      .url(heapDump.downloadUrl)
      .subscribe((resourceUrl) =>
        this.downloadFile(resourceUrl, new URLSearchParams({ filename: heapDump.heapDumpId }), heapDump.heapDumpId),
      );
  }

  downloadTemplate(template: EventTemplate): void {
    let url: Observable<string> | undefined;
    switch (template.type) {
      case 'TARGET':
        url = this.target.target().pipe(
          filter((t) => !!t),
          first(),
          map(
            (target) =>
              `/api/v4/targets/${target!.id}/event_templates/${encodeURIComponent(template.type)}/${encodeURIComponent(template.name)}`,
          ),
          concatMap((resourceUrl) => this.ctx.url(resourceUrl)),
        );
        break;
      default:
        url = of(
          `/api/v4/event_templates/${encodeURIComponent(template.type)}/${encodeURIComponent(template.name)}`,
        ).pipe(concatMap((u) => this.ctx.url(u)));
        break;
    }
    if (!url) {
      console.error(`Could not determine download URL for ${template.type} event template '${template.name}'`);
      return;
    }
    url.subscribe((resourceUrl) => {
      this.downloadFile(resourceUrl, undefined, `${template.name}.jfc`);
    });
  }

  downloadRule(name: string): void {
    this.doGet<Rule>(`rules/${name}`)
      .pipe(first())
      .subscribe((rule) => {
        const filename = `${rule.name}.json`;
        const file = new File([JSON.stringify(rule)], filename);
        const resourceUrl = URL.createObjectURL(file);
        this.downloadFile(resourceUrl, undefined, filename, false);
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

    return this.ctx.headers().pipe(
      concatMap((headers) =>
        this.sendLegacyRequest('v4', 'recordings', 'Recording Upload Failed', {
          method: 'POST',
          body: body,
          headers,
          listeners: {
            onUploadProgress: (event) => {
              onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
            },
          },
          abortSignal,
        }),
      ),
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
    return this.ctx.headers().pipe(
      concatMap((headers) =>
        this.sendLegacyRequest('v4', 'certificates', 'Certificate Upload Failed', {
          method: 'POST',
          body,
          headers,
          listeners: {
            onUploadProgress: (event) => {
              onUploadProgress && onUploadProgress(Math.floor((event.loaded * 100) / event.total));
            },
          },
          abortSignal,
        }),
      ),
      map((resp) => resp.ok),
      tap({
        next: () => (window.onbeforeunload = null),
        error: () => (window.onbeforeunload = null),
      }),
      first(),
    );
  }

  postRecordingMetadata(
    recordingName: string,
    labels: KeyValue[],
    target: Observable<Target>,
  ): Observable<ArchivedRecording[]> {
    return target.pipe(
      filter((target: Target) => !!target),
      first(),
      concatMap((target) =>
        this.graphql<any>(
          `
        query PostRecordingMetadata($id: BigInteger!, $recordingName: String, $labels: [Entry_String_StringInput]) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              archivedRecordings(filter: { name: $recordingName }) {
                data {
                  doPutMetadata(metadataInput:{labels: $labels }) {
                    metadata {
                      labels {
                        key
                        value
                      }
                    }
                    size
                    archivedTime
                  }
                }
              }
            }
          }
        }`,
          {
            id: target.id!,
            recordingName,
            labels: labels.map((label) => ({ key: label.key, value: label.value })),
          },
        ),
      ),
      map((v) => (v.data?.targetNodes[0]?.target?.archivedRecordings as ArchivedRecording[]) ?? []),
    );
  }

  postThreadDumpMetadataForJvmId(jvmId: string, threadDumpId: string, labels: KeyValue[]): Observable<ThreadDump[]> {
    return this.graphql<any>(
      `
      query postThreadDumpMetadataForJvmId($jvmId: String!, $threadDumpId: String!, $labels: [Entry_String_StringInput]) {
        threadDumps(filter: {sourceTarget: $jvmId, name: $threadDumpId }) {
          data {
            doPutMetadata(metadataInput: { labels: $labels }) {
              metadata {
                labels {
                  key
                  value
                }
              }
              size
              lastModified
            }
          }
        }
      }`,
      {
        jvmId,
        threadDumpId,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(map((v) => (v.data?.threadDumps?.data as ThreadDump[]) ?? []));
  }

  postThreadDumpMetadata(threadDumpId: string, labels: KeyValue[], target: Target): Observable<ThreadDump[]> {
    return this.graphql<any>(
      `
        query PostThreadDumpMetadata($id: BigInteger!, $threadDumpId: String, $labels: [Entry_String_StringInput]) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              threadDumps(filter: { name: $threadDumpId }) {
                data {
                  doPutMetadata(metadataInput:{labels: $labels }) {
                    metadata {
                      labels {
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      {
        id: target.id!,
        threadDumpId,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(
      first(),
      map((v) => (v.data?.targetNodes[0]?.target?.threadDumps as ThreadDump[]) ?? []),
    );
  }

  postHeapDumpMetadataForJvmId(jvmId: string, heapDumpId: string, labels: KeyValue[]): Observable<HeapDump[]> {
    return this.graphql<any>(
      `
      query postThreadDumpMetadataForJvmId($jvmId: String!, $heapDumpId: String!, $labels: [Entry_String_StringInput]) {
        heapDumps(filter: {sourceTarget: $jvmId, name: $heapDumpId }) {
          data {
            doPutMetadata(metadataInput: { labels: $labels }) {
              metadata {
                labels {
                  key
                  value
                }
              }
              size
              lastModified
            }
          }
        }
      }`,
      {
        jvmId,
        heapDumpId,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(map((v) => (v.data?.heapDumps?.data as HeapDump[]) ?? []));
  }

  postHeapDumpMetadata(heapDumpId: string, labels: KeyValue[], target: Target): Observable<HeapDump[]> {
    return this.graphql<any>(
      `
        query PostHeapDumpMetadata($id: BigInteger!, $heapDumpId: String, $labels: [Entry_String_StringInput]) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              heapDumps(filter: { name: $heapDumpId }) {
                data {
                  doPutMetadata(metadataInput:{labels: $labels }) {
                    metadata {
                      labels {
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      {
        id: target.id!,
        heapDumpId,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(
      first(),
      map((v) => (v.data?.targetNodes[0]?.target?.heapDumps as HeapDump[]) ?? []),
    );
  }

  postUploadedRecordingMetadata(recordingName: string, labels: KeyValue[]): Observable<ArchivedRecording[]> {
    return this.graphql<any>(
      `
      query PostUploadedRecordingMetadata($connectUrl: String, $recordingName: String, $labels: [Entry_String_StringInput]){
        archivedRecordings(filter: {sourceTarget: $connectUrl, name: $recordingName }) {
          data {
            doPutMetadata(metadataInput: { labels: $labels }) {
              metadata {
                labels {
                  key
                  value
                }
              }
              size
              archivedTime
            }
          }
        }
      }`,
      {
        connectUrl: UPLOADS_SUBDIRECTORY,
        recordingName,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(map((v) => (v.data?.archivedRecordings?.data as ArchivedRecording[]) ?? []));
  }

  postTargetRecordingMetadata(
    recordingName: string,
    labels: KeyValue[],
    target: Target,
  ): Observable<ActiveRecording[]> {
    return this.graphql<any>(
      `
        query PostActiveRecordingMetadata($id: BigInteger!, $recordingName: String, $labels: [Entry_String_StringInput]) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              activeRecordings(filter: { name: $recordingName }) {
                data {
                  doPutMetadata(metadataInput:{labels: $labels}) {
                    id
                    name
                    metadata {
                      labels {
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      {
        id: target.id!,
        recordingName,
        labels: labels.map((label) => ({ key: label.key, value: label.value })),
      },
    ).pipe(
      first(),
      map((v) => (v.data?.targetNodes[0]?.target?.activeRecordings as ActiveRecording[]) ?? []),
    );
  }

  postCredentials(matchExpression: string, username: string, password: string): Observable<boolean> {
    const body = new window.FormData();
    body.append('matchExpression', matchExpression);
    body.append('username', username);
    body.append('password', password);

    return this.sendRequest('v4', 'credentials', {
      method: 'POST',
      body,
    }).pipe(
      map((resp) => resp.ok),
      catchError((_) => of(false)),
      first(),
    );
  }

  getCredential(id: number): Observable<MatchedCredential> {
    return this.sendRequest('v4', `credentials/${id}`, {
      method: 'GET',
    }).pipe(
      concatMap((resp) => resp.json()),
      first(),
    );
  }

  getCredentials(suppressNotifications = false, skipStatusCheck = false): Observable<MatchedCredential[]> {
    return this.sendRequest(
      'v4',
      `credentials`,
      {
        method: 'GET',
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      concatMap((resp) => resp.json()),
      first(),
    );
  }

  deleteCredentials(id: number): Observable<boolean> {
    return this.sendRequest('v4', `credentials/${id}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      first(),
    );
  }

  getRules(suppressNotifications = false, skipStatusCheck = false): Observable<Rule[]> {
    return this.sendRequest(
      'v4',
      'rules',
      {
        method: 'GET',
      },
      undefined,
      suppressNotifications,
      skipStatusCheck,
    ).pipe(
      concatMap((resp) => resp.json()),
      first(),
    );
  }

  getDiscoveryTree(mergeRealms = true): Observable<EnvironmentNode> {
    const params = new URLSearchParams([['mergeRealms', `${mergeRealms}`]]);
    return this.sendRequest(
      'v4',
      'discovery',
      {
        method: 'GET',
      },
      params,
    ).pipe(
      concatMap((resp) => resp.json()),
      first(),
    );
  }

  // Filter targets that the expression matches
  matchTargetsWithExpr(matchExpression: string, targets: Target[]): Observable<Target[]> {
    const body = JSON.stringify({
      matchExpression,
      targets: targets.map((t) => this.transformTarget(t)),
    });
    return this.ctx
      .headers({
        'Content-Type': 'application/json',
      })
      .pipe(
        concatMap((headers) =>
          this.sendRequest(
            'v4',
            'matchExpressions',
            {
              method: 'POST',
              body,
              headers,
            },
            undefined,
            true,
            true,
          ),
        ),
        first(),
        concatMap((resp: Response) => resp.json()),
        map((r) => r.targets),
      );
  }

  isTargetMatched(matchExpression: string, target: Target): Observable<boolean> {
    return this.matchTargetsWithExpr(matchExpression, [target]).pipe(
      first(),
      map((ts) => includesTarget(ts, target)),
      catchError((_) => of(false)),
    );
  }

  groupHasRecording(group: EnvironmentNode, filter: ActiveRecordingsFilterInput): Observable<boolean> {
    return this.graphql<any>(
      `
    query GroupHasRecording ($groupFilter: DiscoveryNodeFilterInput, $recordingFilter: ActiveRecordingsFilterInput){
      environmentNodes(filter: $groupFilter) {
        name
        descendantTargets {
          name
          target {
            activeRecordings(filter: $recordingFilter) {
              aggregate {
                count
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
        (body.data?.environmentNodes[0]?.descendantTargets ?? []).reduce(
          (acc: number, curr) => acc + curr.target.activeRecordings.aggregate.count,
          0,
        ),
      ),
      catchError((_) => of([])),
      map((acc) => acc > 0), // At least one
    );
  }

  targetRecordingRemoteIdByOrigin(target: TargetStub, origin: string): Observable<number | undefined> {
    return this.graphql<any>(
      `
        query ActiveRecordingIdForRecordingByOriginLabel($id: BigInteger!) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              activeRecordings(filter: {
                labels: ["origin=${origin}"]
              }) {
                data {
                  remoteId
                }
              }
            }
          }
        }
      `,
      { id: target.id },
    ).pipe(
      map((resp) => {
        const nodes = resp.data?.targetNodes ?? [];
        if (nodes.length === 0) {
          return undefined;
        }
        const data = nodes[0]?.target?.activeRecordings?.data ?? [];
        if (data.length === 0) {
          return undefined;
        }
        return data[0]?.remoteId;
      }),
    );
  }

  targetHasJFRMetricsRecording(target: TargetStub, filter: ActiveRecordingsFilterInput = {}): Observable<boolean> {
    return this.graphql<RecordingCountResponse>(
      `
        query ActiveRecordingsForJFRMetrics($id: BigInteger!, $recordingFilter: ActiveRecordingsFilterInput) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              activeRecordings(filter: $recordingFilter) {
                aggregate {
                  count
                }
              }
            }
          }
        }`,
      {
        id: target.id!,
        recordingFilter: filter,
      },
      true,
      true,
    ).pipe(
      map((resp) => {
        const nodes = resp.data?.targetNodes ?? [];
        if (nodes.length === 0) {
          return false;
        }
        const count = nodes[0]?.target?.activeRecordings?.aggregate?.count ?? 0;
        return count > 0;
      }),
      catchError((_) => of(false)),
    );
  }

  checkCredentialForTarget(
    target: TargetStub,
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
      'v4',
      `credentials/test/${target.id}`,
      { method: 'POST', body },
      undefined,
      true,
      true,
    ).pipe(
      first(),
      concatMap((resp) => resp.json()),
      map((body) => {
        const result: string | undefined = body;
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

  getTargetMBeanMetrics(target: TargetStub, queries: string[]): Observable<MBeanMetrics> {
    return this.graphql<MBeanMetricsResponse>(
      `
        query MBeanMXMetricsForTarget($id: BigInteger!) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              mbeanMetrics {
                ${queries.join('\n')}
              }
            }
          }
        }`,
      { id: target.id! },
    ).pipe(
      map((resp) => {
        const nodes = resp.data?.targetNodes ?? [];
        if (!nodes || nodes.length === 0) {
          return {};
        }
        return nodes[0]?.target?.mbeanMetrics ?? {};
      }),
      catchError((_) => of({})),
    );
  }

  getTargetArchivedRecordings(target: TargetStub): Observable<ArchivedRecording[]> {
    return this.graphql<any>(
      `
        query ArchivedRecordingsForTarget($id: BigInteger!) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              archivedRecordings {
                data {
                  name
                  downloadUrl
                  reportUrl
                  metadata {
                    labels {
                      key
                      value
                    }
                  }
                  size
                  archivedTime
                }
              }
            }
          }
        }`,
      { id: target.id! },
      true,
      true,
    ).pipe(map((v) => (v.data?.targetNodes[0]?.target?.archivedRecordings?.data as ArchivedRecording[]) ?? []));
  }

  getTargetThreadDumps(target: TargetStub): Observable<ThreadDump[]> {
    return this.graphql<any>(
      `
        query ThreadDumpsForTarget($id: BigInteger!) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              threadDumps {
                data {
                  jvmId
                  downloadUrl
                  threadDumpId
                  lastModified
                  size
                  metadata {
                    labels {
                      key
                      value
                    }
                  }
                }
                aggregate {
                  count
                }
              }
            }
          }
        }`,
      { id: target.id! },
      true,
      true,
    ).pipe(map((v) => (v.data?.targetNodes[0]?.target?.threadDumps?.data as ThreadDump[]) ?? []));
  }

  getTargetHeapDumps(target: TargetStub): Observable<HeapDump[]> {
    return this.graphql<any>(
      `
        query HeapDumpsForTarget($id: BigInteger!) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              heapDumps {
                data {
                  jvmId
                  downloadUrl
                  heapDumpId
                  lastModified
                  size
                  metadata {
                    labels {
                      key
                      value
                    }
                  }
                }
                aggregate {
                  count
                }
              }
            }
          }
        }`,
      { id: target.id! },
      true,
      true,
    ).pipe(map((v) => (v.data?.targetNodes[0]?.target?.heapDumps?.data as HeapDump[]) ?? []));
  }

  getTargetActiveRecordings(
    target: TargetStub,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<ActiveRecording[]> {
    return this.doGet(`targets/${target.id}/recordings`, 'v4', undefined, suppressNotifications, skipStatusCheck);
  }

  getUploadedRecordings(): Observable<ArchivedRecording[]> {
    return this.graphql<any>(
      `query UploadedRecordings($filter: ArchivedRecordingsFilterInput) {
        archivedRecordings(filter: $filter) {
          data {
            name
            downloadUrl
            reportUrl
            metadata {
              labels {
                key
                value
              }
            }
            size
          }
        }
      }`,
      { filter: { sourceTarget: UPLOADS_SUBDIRECTORY } },
      true,
      true,
    ).pipe(map((v) => (v?.data?.archivedRecordings?.data as ArchivedRecording[]) ?? []));
  }

  getEventTemplates(suppressNotifications = false, skipStatusCheck = false): Observable<EventTemplate[]> {
    return this.doGet<EventTemplate[]>('event_templates', 'v4', undefined, suppressNotifications, skipStatusCheck);
  }

  getTargetEventTemplates(
    target: TargetStub,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<EventTemplate[]> {
    return this.doGet<EventTemplate[]>(
      `targets/${target.id}/event_templates`,
      'v4',
      undefined,
      suppressNotifications,
      skipStatusCheck,
    );
  }

  getTargetEventTypes(
    target: TargetStub,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<EventType[]> {
    return this.doGet<EventType[]>(
      `targets/${target.id}/events`,
      'v4',
      undefined,
      suppressNotifications,
      skipStatusCheck,
    );
  }

  getAsyncProfilerStatus(target: Target, suppressNotifications = false): Observable<AsyncProfilerStatus> {
    return this.doGet<{
      currentProfile: {
        id: string;
        events: string[];
        startTime: number;
        duration: number;
      };
      status: string;
      availableEvents: string[];
    }>(`targets/${target.id}/async-profiler/status`, 'beta', undefined, suppressNotifications).pipe(
      map((s) => ({ ...s, status: s['status'] === 'RUNNING' })),
    );
  }

  isAsyncProfilerSupported(target: Target): Observable<boolean> {
    return this.getAsyncProfilerStatus(target, true).pipe(
      map((_) => true),
      catchError((_) => of(false)),
      first(),
    );
  }

  getAsyncProfilerAvailableEvents(target: Target): Observable<string[]> {
    return this.doGet<string[]>(`targets/${target.id}/async-profiler/status`, 'beta').pipe(
      map((s) => s['availableEvents']),
    );
  }

  startAsyncProfile(target: Target, events: string[], duration: number) {
    return this.ctx
      .headers({
        'Content-Type': 'application/json',
      })
      .pipe(
        concatMap((headers) =>
          this.sendRequest('beta', `targets/${target.id}/async-profiler`, {
            method: 'POST',
            body: JSON.stringify({
              events,
              duration,
            }),
            headers,
          }),
        ),
        map((resp) => ({
          ok: resp.ok,
          status: resp.status,
        })),
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
      );
  }

  getAsyncProfiles(target: Target): Observable<AsyncProfile[]> {
    return this.doGet<AsyncProfile[]>(`targets/${target.id}/async-profiler`, 'beta');
  }

  downloadAsyncProfile(target: Target, profileId: string): void {
    this.ctx.url(`/api/beta/targets/${target.id}/async-profiler/${profileId}`).subscribe((resourceUrl) => {
      const jfrFilename = `${target.alias}_${profileId}.asprof.jfr`;
      this.downloadFile(resourceUrl, new URLSearchParams({ filename: jfrFilename }), jfrFilename);
    });
  }

  deleteAsyncProfile(target: Target, profileId: string): Observable<boolean> {
    return this.sendRequest('beta', `targets/${target.id}/async-profiler/${profileId}`, {
      method: 'DELETE',
    }).pipe(
      map((resp) => resp.ok),
      catchError(() => of(false)),
      first(),
    );
  }

  downloadLayoutTemplate(template: LayoutTemplate): void {
    const stringifiedSerializedLayout = this.stringifyLayoutTemplate(template);
    const filename = `cryostat-dashboard-${template.name}.json`;
    const resourceUrl = createBlobURL(stringifiedSerializedLayout, 'application/json');
    this.downloadFile(resourceUrl, undefined, filename, false);
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

  private instanceSelectorHeadersAsQuery(): Observable<string> {
    return this.ctx.headers().pipe(
      map((headers) => {
        let ns: string | undefined;
        let name: string | undefined;
        if (headers.has('cryostat-svc-ns')) {
          ns = headers.get('cryostat-svc-ns')!;
        }
        if (headers.has('cryostat-svc-name')) {
          name = headers.get('cryostat-svc-name')!;
        }
        if (ns && name) {
          const query = new URLSearchParams([
            ['ns', ns],
            ['name', name],
          ]);
          return query.toString();
        }
        return '';
      }),
    );
  }

  private downloadFile(url: string, query: URLSearchParams | undefined, filename: string, headers = true): void {
    const o = headers ? this.instanceSelectorHeadersAsQuery() : of('');
    o.subscribe((q) => {
      const anchor = document.createElement('a');
      anchor.setAttribute('style', 'display: none; visibility: hidden;');
      anchor.target = '_blank';
      let href = url;
      anchor.download = filename;
      if (query) {
        href.includes('?') ? (href += `&${query.toString()}`) : (href += `?${query.toString()}`);
      }
      if (q) {
        href.includes('?') ? (href += `&${q}`) : (href += `?${q}`);
      }
      anchor.href = href;
      anchor.click();
      anchor.remove();
    });
  }

  private transformTarget(target: Target): TargetForTest {
    const out: TargetForTest = {
      alias: target.alias,
      connectUrl: target.connectUrl,
      labels: {},
      annotations: { cryostat: {}, platform: {} },
    };
    for (const l of target.labels) {
      out.labels[l.key] = l.value;
    }
    for (const s of ['cryostat', 'platform']) {
      for (const [key, value] of Object.entries(out.annotations[s])) {
        target.annotations[s][key] = value;
      }
    }
    return out;
  }

  sendRequest(
    apiVersion: ApiVersion,
    path: string,
    config?: RequestInit,
    params?: URLSearchParams,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<Response> {
    const p = apiVersion === 'unversioned' ? path : `/api/${apiVersion}/${path}`;
    const req = () =>
      combineLatest([
        this.ctx.url(`${p}${params ? '?' + params : ''}`),
        this.ctx.headers(config?.headers).pipe(
          map((headers) => {
            const cfg = config || {};
            if (!cfg.headers) {
              cfg.headers = new Headers();
            }
            const mergedHeaders = new Headers();
            [headers, cfg.headers].forEach((source) => new Headers(source).forEach((v, k) => mergedHeaders.set(k, v)));
            cfg.headers = mergedHeaders;
            return cfg;
          }),
        ),
      ]).pipe(
        concatMap((parts) => fromFetch(parts[0], parts[1])),
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
        this.target.setAuthFailure();
        return this.target.authRetry().pipe(mergeMap(() => retry()));
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
    } else if (isGraphQLError(error)) {
      if (isGraphQLAuthError(error)) {
        this.target.setAuthFailure();
        return this.target.authRetry().pipe(mergeMap(() => retry()));
      } else if (isGraphQLSSLError(error)) {
        this.target.setSslFailure();
      } else {
        if (!suppressNotifications) {
          error.errors.forEach((err) =>
            this.notifications.danger(`Request failed (${err.extensions.classification})`, err.message),
          );
        }
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
    title: string,
    { method = 'GET', body, headers, listeners, abortSignal }: XMLHttpRequestConfig,
    params?: URLSearchParams,
    suppressNotifications = false,
    skipStatusCheck = false,
  ): Observable<XMLHttpResponse> {
    const req = () =>
      from(
        new Promise<XMLHttpResponse>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          this.ctx
            .url(`/api/${apiVersion}/${path}${params ? '?' + params : ''}`)
            .pipe(first())
            .subscribe((u) => {
              xhr.open(method, u, true);

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
              headers && Object.keys(headers).forEach((k) => xhr.setRequestHeader(k, headers[k]));
              xhr.withCredentials = true;

              // Send request
              xhr.send(body);
            });
        }),
      ).pipe(
        map((resp) => {
          if (resp.ok) return resp;
          throw new XMLHttpError(resp);
        }),
        catchError((err) => {
          if (skipStatusCheck) {
            throw err;
          }
          return this.handleLegacyError<XMLHttpResponse>(err, title, req, suppressNotifications);
        }),
      );
    return req();
  }

  private handleLegacyError<T>(
    error: Error,
    title: string,
    retry: () => Observable<T>,
    suppressNotifications = false,
  ): ObservableInput<T> {
    if (isXMLHttpError(error)) {
      if (error.xmlHttpResponse.status === 427) {
        this.target.setAuthFailure();
        return this.target.authRetry().pipe(mergeMap(() => retry()));
      } else if (error.xmlHttpResponse.status === 502) {
        this.target.setSslFailure();
      } else {
        Promise.resolve(error.xmlHttpResponse.body as string).then((detail) => {
          if (!suppressNotifications) {
            this.notifications.danger(title, detail);
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
