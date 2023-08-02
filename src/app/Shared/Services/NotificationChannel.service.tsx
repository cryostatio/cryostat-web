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
import { Notifications } from '@app/Notifications/Notifications';
import { AlertVariant } from '@patternfly/react-core';
import _ from 'lodash';
import { BehaviorSubject, combineLatest, Observable, Subject, timer } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { concatMap, distinctUntilChanged, filter } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { AuthMethod, LoginService, SessionState } from './Login.service';
import { Target } from './Target.service';
import { TargetDiscoveryEvent } from './Targets.service';

export enum NotificationCategory {
  WsClientActivity = 'WsClientActivity',
  TargetJvmDiscovery = 'TargetJvmDiscovery',
  ActiveRecordingCreated = 'ActiveRecordingCreated',
  ActiveRecordingStopped = 'ActiveRecordingStopped',
  ActiveRecordingSaved = 'ActiveRecordingSaved',
  ActiveRecordingDeleted = 'ActiveRecordingDeleted',
  SnapshotCreated = 'SnapshotCreated',
  SnapshotDeleted = 'SnapshotDeleted',
  ArchivedRecordingCreated = 'ArchivedRecordingCreated',
  ArchivedRecordingDeleted = 'ArchivedRecordingDeleted',
  TemplateUploaded = 'TemplateUploaded',
  TemplateDeleted = 'TemplateDeleted',
  ProbeTemplateUploaded = 'ProbeTemplateUploaded',
  ProbeTemplateDeleted = 'ProbeTemplateDeleted',
  ProbeTemplateApplied = 'ProbeTemplateApplied',
  ProbesRemoved = 'ProbesRemoved',
  RuleCreated = 'RuleCreated',
  RuleUpdated = 'RuleUpdated',
  RuleDeleted = 'RuleDeleted',
  RecordingMetadataUpdated = 'RecordingMetadataUpdated',
  GrafanaConfiguration = 'GrafanaConfiguration', // generated client-side
  LayoutTemplateCreated = 'LayoutTemplateCreated', // generated client-side
  TargetCredentialsStored = 'TargetCredentialsStored',
  TargetCredentialsDeleted = 'TargetCredentialsDeleted',
  CredentialsStored = 'CredentialsStored',
  CredentialsDeleted = 'CredentialsDeleted',
}

export enum CloseStatus {
  LOGGED_OUT = 1000,
  PROTOCOL_FAILURE = 1002,
  INTERNAL_ERROR = 1011,
  UNKNOWN = -1,
}

interface ReadyState {
  ready: boolean;
  code?: CloseStatus;
}

export const messageKeys = new Map([
  [
    // explicitly configure this category with a null message body mapper.
    // This is a special case because this is generated client-side,
    // not sent by the backend
    NotificationCategory.GrafanaConfiguration,
    {
      title: 'Grafana Configuration',
    },
  ],
  [
    NotificationCategory.LayoutTemplateCreated,
    {
      title: 'Layout Template Created',
    },
  ],
  [
    NotificationCategory.TargetJvmDiscovery,
    {
      variant: AlertVariant.info,
      title: 'Target JVM Discovery',
      body: (v) => {
        const evt: TargetDiscoveryEvent = v.message.event;
        const target: Target = evt.serviceRef;
        switch (evt.kind) {
          case 'FOUND':
            return `Target "${target.alias}" appeared (${target.connectUrl})"`;
          case 'LOST':
            return `Target "${target.alias}" disappeared (${target.connectUrl})"`;
          case 'MODIFIED':
            return `Target "${target.alias}" was modified (${target.connectUrl})"`;
          default:
            return `Received a notification with category ${NotificationCategory.TargetJvmDiscovery} and unrecognized kind ${evt.kind}`;
        }
      },
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.WsClientActivity,
    {
      variant: AlertVariant.info,
      title: 'WebSocket Client Activity',
      body: (evt) => {
        const addr = Object.keys(evt.message)[0];
        const status = evt.message[addr];
        return `Client at ${addr} ${status}`;
      },
      hidden: true,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingCreated,
    {
      variant: AlertVariant.success,
      title: 'Recording Created',
      body: (evt) => `${evt.message.recording.name} created in target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingStopped,
    {
      variant: AlertVariant.success,
      title: 'Recording Stopped',
      body: (evt) => `${evt.message.recording.name} was stopped`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingSaved,
    {
      variant: AlertVariant.success,
      title: 'Recording Saved',
      body: (evt) => `${evt.message.recording.name} was archived`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingDeleted,
    {
      variant: AlertVariant.success,
      title: 'Recording Deleted',
      body: (evt) => `${evt.message.recording.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.SnapshotCreated,
    {
      variant: AlertVariant.success,
      title: 'Snapshot Created',
      body: (evt) => `${evt.message.recording.name} was created in target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.SnapshotDeleted,
    {
      variant: AlertVariant.success,
      title: 'Snapshot Deleted',
      body: (evt) => `${evt.message.recording.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ArchivedRecordingCreated,
    {
      variant: AlertVariant.success,
      title: 'Archived Recording Uploaded',
      body: (evt) => `${evt.message.recording.name} was uploaded into archives`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ArchivedRecordingDeleted,
    {
      variant: AlertVariant.success,
      title: 'Archived Recording Deleted',
      body: (evt) => `${evt.message.recording.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TemplateUploaded,
    {
      variant: AlertVariant.success,
      title: 'Template Created',
      body: (evt) => `${evt.message.template.name} was created`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbeTemplateUploaded,
    {
      variant: AlertVariant.success,
      title: 'Probe Template Created',
      body: (evt) => `${evt.message.probeTemplate} was created`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbeTemplateApplied,
    {
      variant: AlertVariant.success,
      title: 'Probe Template Applied',
      body: (evt) => `${evt.message.probeTemplate} was inserted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TemplateDeleted,
    {
      variant: AlertVariant.success,
      title: 'Template Deleted',
      body: (evt) => `${evt.message.template.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbeTemplateDeleted,
    {
      variant: AlertVariant.success,
      title: 'Probe Template Deleted',
      body: (evt) => `${evt.message.probeTemplate} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbesRemoved,
    {
      variant: AlertVariant.success,
      title: 'Probes Removed from Target',
      body: (evt) => `Probes successfully removed from ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RuleCreated,
    {
      variant: AlertVariant.success,
      title: 'Automated Rule Created',
      body: (evt) => `${evt.message.name} was created`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RuleUpdated,
    {
      variant: AlertVariant.success,
      title: 'Automated Rule Updated',
      body: (evt) => `${evt.message.name} was ` + (evt.message.enabled ? 'enabled' : 'disabled'),
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RuleDeleted,
    {
      variant: AlertVariant.success,
      title: 'Automated Rule Deleted',
      body: (evt) => `${evt.message.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RecordingMetadataUpdated,
    {
      variant: AlertVariant.success,
      title: 'Recording Metadata Updated',
      body: (evt) => `${evt.message.recordingName} metadata was updated`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TargetCredentialsStored,
    {
      variant: AlertVariant.success,
      title: 'Target Credentials Stored',
      body: (evt) => `Credentials stored for target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TargetCredentialsDeleted,
    {
      variant: AlertVariant.success,
      title: 'Target Credentials Deleted',
      body: (evt) => `Credentials deleted for target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.CredentialsStored,
    {
      variant: AlertVariant.success,
      title: 'Credentials Stored',
      body: (evt) => `Credentials stored for: ${evt.message.matchExpression}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.CredentialsDeleted,
    {
      variant: AlertVariant.success,
      title: 'Credentials Deleted',
      body: (evt) => `Credentials deleted for: ${evt.message.matchExpression}`,
    } as NotificationMessageMapper,
  ],
]);

interface NotificationMessageMapper {
  title: string;
  body?: (evt: NotificationMessage) => string;
  variant?: AlertVariant;
  hidden?: boolean;
}

export class NotificationChannel {
  private ws: WebSocketSubject<NotificationMessage> | null = null;
  private readonly _messages = new Subject<NotificationMessage>();
  private readonly _ready = new BehaviorSubject<ReadyState>({ ready: false });

  constructor(private readonly notifications: Notifications, private readonly login: LoginService) {
    messageKeys.forEach((value, key) => {
      if (!value || !value.body || !value.variant) {
        return;
      }
      this.messages(key).subscribe((msg: NotificationMessage) => {
        if (!value || !value.body || !value.variant) {
          return;
        }
        const message = value.body(msg);
        this.notifications.notify({
          title: value.title,
          message,
          category: key,
          variant: value.variant,
          hidden: value.hidden,
        });
      });
    });

    // fallback handler for unknown categories of message
    this._messages
      .pipe(filter((msg) => !messageKeys.has(msg.meta.category as NotificationCategory)))
      .subscribe((msg) => {
        const category = NotificationCategory[msg.meta.category as keyof typeof NotificationCategory];
        this.notifications.notify({
          title: msg.meta.category,
          message: msg.message,
          category,
          variant: AlertVariant.success,
        });
      });

    const notificationsUrl = fromFetch(`${this.login.authority}/api/v1/notifications_url`).pipe(
      concatMap(async (resp) => {
        if (resp.ok) {
          const body: NotificationsUrlGetResponse = await resp.json();
          return body.notificationsUrl;
        } else {
          const body: string = await resp.text();
          throw new Error(resp.status + ' ' + body);
        }
      })
    );

    combineLatest([
      notificationsUrl,
      this.login.getToken(),
      this.login.getAuthMethod(),
      this.login.getSessionState(),
      timer(0, 5000),
    ])
      .pipe(distinctUntilChanged(_.isEqual))
      .subscribe({
        next: (parts: string[]) => {
          const url = parts[0];
          const token = parts[1];
          const authMethod = parts[2];
          const sessionState = parseInt(parts[3]);
          let subprotocol: string | undefined = undefined;

          if (sessionState !== SessionState.CREATING_USER_SESSION) {
            return;
          }

          if (authMethod === AuthMethod.BEARER) {
            subprotocol = `base64url.bearer.authorization.cryostat.${token}`;
          } else if (authMethod === AuthMethod.BASIC) {
            subprotocol = `basic.authorization.cryostat.${token}`;
          }

          if (this.ws) {
            this.ws.complete();
          }

          this.ws = webSocket({
            url,
            protocol: subprotocol,
            openObserver: {
              next: () => {
                this._ready.next({ ready: true });
                this.login.setSessionState(SessionState.USER_SESSION);
              },
            },
            closeObserver: {
              next: (evt) => {
                let code: CloseStatus;
                let msg: string | undefined = undefined;
                let fn: typeof this.notifications.info;
                let sessionState: SessionState;
                switch (evt.code) {
                  case CloseStatus.LOGGED_OUT:
                    code = CloseStatus.LOGGED_OUT;
                    msg = 'Logout success';
                    fn = this.notifications.info;
                    sessionState = SessionState.NO_USER_SESSION;
                    break;
                  case CloseStatus.PROTOCOL_FAILURE:
                    code = CloseStatus.PROTOCOL_FAILURE;
                    msg = 'Authentication failed';
                    fn = this.notifications.danger;
                    sessionState = SessionState.NO_USER_SESSION;
                    break;
                  case CloseStatus.INTERNAL_ERROR:
                    code = CloseStatus.INTERNAL_ERROR;
                    msg = 'Internal server error';
                    fn = this.notifications.danger;
                    sessionState = SessionState.CREATING_USER_SESSION;
                    break;
                  default:
                    code = CloseStatus.UNKNOWN;
                    fn = this.notifications.info;
                    sessionState = SessionState.CREATING_USER_SESSION;
                    break;
                }
                this._ready.next({ ready: false, code });
                this.login.setSessionState(sessionState);
                fn.apply(this.notifications, [
                  'WebSocket connection lost',
                  msg,
                  NotificationCategory.WsClientActivity,
                  fn === this.notifications.info,
                ]);
              },
            },
          });

          this.ws.subscribe({
            next: (v) => this._messages.next(v),
            error: (err: Error) => this.logError('WebSocket error', err),
          });

          // message doesn't matter, we just need to send something to the server so that our SubProtocol token can be authenticated
          this.ws.next({ message: 'connect' } as NotificationMessage);
        },
        error: (err: Error) => this.logError('Notifications URL configuration', err),
      });

    this.login.loggedOut().subscribe({
      next: () => {
        this.ws?.complete();
      },
      error: (err: Error) => this.logError('Notifications URL configuration', err),
    });
  }

  isReady(): Observable<ReadyState> {
    return this._ready.asObservable();
  }

  messages(category: string): Observable<NotificationMessage> {
    return this._messages.asObservable().pipe(filter((msg) => msg.meta.category === category));
  }

  private logError(title: string, err: Error): void {
    console.error(`${title}:${err.message}`);
    err.stack && console.error(err.stack);
    this.notifications.danger(title, JSON.stringify(err.message));
  }
}

interface NotificationsUrlGetResponse {
  notificationsUrl: string;
}

export interface NotificationMessage {
  meta: MessageMeta;
  // Should a message be any type? Try T?
  message: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  serverTime: number;
}

export interface MessageMeta {
  category: string;
  type: MessageType;
}

export interface MessageType {
  type: string;
  subtype: string;
}
