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
import { Notifications } from '@app/Notifications/Notifications';
import { BehaviorSubject, combineLatest, Observable, Subject, timer } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { concatMap, distinctUntilChanged, filter } from 'rxjs/operators';
import * as _ from 'lodash';
import { AuthMethod, LoginService, SessionState } from './Login.service';
import { SavedRecording } from '@app/Shared/Services/Api.service';

interface RecordingNotificationEvent {
  recording: SavedRecording;
  target: string;
}

export enum NotificationCategory {
  JvmDiscovery = 'TargetJvmDiscovery',
  RecordingCreated = 'RecordingCreated',
  RecordingDeleted = 'RecordingDeleted',
  RecordingStopped = 'RecordingStopped',
  RecordingSaved = 'RecordingSaved',
  RecordingArchived = 'RecordingArchived',
  WsClientActivity = 'WsClientActivity'
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

export class NotificationChannel {

  private ws: WebSocketSubject<any> | null = null;
  private readonly _messages = new Subject<NotificationMessage>();
  private readonly _ready = new BehaviorSubject<ReadyState>({ ready: false });

  constructor(
    private readonly notifications: Notifications,
    private readonly login: LoginService
  ) {
    this.messages(NotificationCategory.WsClientActivity).subscribe(v => {
      const addr = Object.keys(v.message)[0];
      const status = v.message[addr];
      notifications.info('WebSocket Client Activity', `Client at ${addr} ${status}`, NotificationCategory.WsClientActivity);
    });

    this.messages(NotificationCategory.RecordingCreated).subscribe(v => {
      const event: RecordingNotificationEvent = v.message;
      notifications.success('Recording Created', `${event.recording} created in target: ${event.target}`);
    });

    this.messages(NotificationCategory.RecordingStopped).subscribe(v => {
      const event: RecordingNotificationEvent = v.message;
      notifications.success('Recording Stopped', `${event.recording} was stopped`);
    });

    this.messages(NotificationCategory.RecordingSaved).subscribe(v => {
      const event: RecordingNotificationEvent = v.message;
      notifications.success('Recording Archived', `${event.recording.name} was uploaded into archives`);
    });

    this.messages(NotificationCategory.RecordingArchived).subscribe(v => {
      const event: RecordingNotificationEvent = v.message;
      notifications.success('Recording Archived', `${event.recording.name} was archived`);
    });

    this.messages(NotificationCategory.RecordingDeleted).subscribe(v => {
      const event: RecordingNotificationEvent = v.message;
      notifications.success('Recording Deleted', `${event.recording.name} was deleted`);
    });

    const notificationsUrl = fromFetch(`${this.login.authority}/api/v1/notifications_url`)
      .pipe(
        concatMap(async resp => {
          if (resp.ok) {
            let body: any = await resp.json();
            return body.notificationsUrl;
          } else {
            let body: string = await resp.text();
            throw new Error(resp.status + ' ' + body);
          }
        })
      );

    combineLatest([notificationsUrl, this.login.getToken(), this.login.getAuthMethod(), this.login.getSessionState(), timer(0, 5000)])
    .pipe(distinctUntilChanged(_.isEqual))
    .subscribe({
        next: (parts: string[]) => {
          const url = parts[0];
          const token = parts[1];
          const authMethod = parts[2];
          const sessionState = parseInt(parts[3]);
          let subprotocol: string | undefined = undefined;

          if(sessionState !== SessionState.CREATING_USER_SESSION) {
            return;
          }

          if (authMethod === AuthMethod.BEARER) {
            subprotocol = `base64url.bearer.authorization.cryostat.${token}`;
          } else if (authMethod === AuthMethod.BASIC) {
            subprotocol = `basic.authorization.cryostat.${token}`;
          }

          if (!!this.ws) {
            this.ws.complete();
          }

          this.ws = webSocket({
            url,
            protocol: subprotocol,
            openObserver: {
              next: () => {
                this._ready.next({ ready: true });
                this.login.setSessionState(SessionState.USER_SESSION);
              }
            },
            closeObserver: {
              next: (evt) => {
                let code: CloseStatus;
                let msg: string | undefined = undefined;
                let fn: Function;
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
                fn.apply(this.notifications, ['WebSocket connection lost', msg, NotificationCategory.WsClientActivity]);
              }
            }
          });

          this.ws.subscribe({
            next: v => this._messages.next(v),
            error: err => this.logError('WebSocket error', err)
          });

          // message doesn't matter, we just need to send something to the server so that our SubProtocol token can be authenticated
          this.ws.next('connect');
        },
        error: (err: any) => this.logError('Notifications URL configuration', err)
      });

    this.login.loggedOut()
    .subscribe({
      next: () => {
        this.ws?.complete();
      },
      error: (err: any) => this.logError('Notifications URL configuration', err)
    });

  }

  isReady(): Observable<ReadyState> {
    return this._ready.asObservable();
  }

  messages(category: string): Observable<NotificationMessage> {
    return this._messages.asObservable().pipe(filter(msg => msg.meta.category === category));
  }

  private logError(title: string, err: any): void {
    window.console.error(err?.message);
    window.console.error(err?.stack);

    if(!!err?.message) {
      this.notifications.danger(title, JSON.stringify(err?.message));
    }
  }
}

export interface NotificationMessage {
  meta: MessageMeta;
  message: any;
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
