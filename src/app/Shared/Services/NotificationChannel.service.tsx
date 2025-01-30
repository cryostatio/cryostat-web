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
import { AlertVariant } from '@patternfly/react-core';
import _ from 'lodash';
import { BehaviorSubject, combineLatest, Observable, Subject, timer } from 'rxjs';
import { concatMap, distinctUntilChanged, filter, first, map } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { NotificationMessage, ReadyState, CloseStatus, NotificationCategory } from './api.types';
import { messageKeys } from './api.utils';
import { LoginService } from './Login.service';
import { NotificationService } from './Notifications.service';
import { SessionState } from './service.types';
import { CryostatContext } from './Services';

export class NotificationChannel {
  private ws: WebSocketSubject<NotificationMessage> | null = null;
  private readonly _messages = new Subject<NotificationMessage>();
  private readonly _ready = new BehaviorSubject<ReadyState>({ ready: false });

  constructor(
    private readonly ctx: CryostatContext,
    private readonly notifications: NotificationService,
    private readonly login: LoginService,
  ) {
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

    this.login.loggedOut().subscribe({
      next: () => {
        this.ws?.complete();
      },
      error: (err: Error) => this.logError('Notifications URL configuration', err),
    });
  }

  connect(): void {
    combineLatest([
      this.login.getSessionState(),
      this.ctx.url('/api/notifications').pipe(
        first(),
        map((u) => {
          let wsUrl: URL;
          try {
            wsUrl = new URL(u);
          } catch (e) {
            // wasn't a URL - assume it was a relative path alone, which is OK
            wsUrl = new URL(window.location.href);
            wsUrl.pathname = u;
          }
          // set the proper protocol for WebSocket connection upgrade
          wsUrl.protocol = wsUrl.protocol.replace('http', 'ws');
          return wsUrl.toString();
        }),
        concatMap((url) => {
          // set the instance namespace and name headers as query parameters instead.
          // This is not used by normal Cryostat Web operation, where the instance is
          // always the server that is hosting the web instance itself. In the console
          // plugin case, the <namespace, name> instance selector is normally sent to
          // the plugin backend by custom HTTP request headers so that the plugin backend
          // can proxy to the correct Cryostat server instance. We cannot set custom
          // request headers in the WebSocket connection request, so we set them as query
          // parameters instead so that the plugin backend can fall back to finding those.
          return this.ctx.headers().pipe(
            map((headers) => {
              const searchParams = new URLSearchParams();
              if (headers.has('CRYOSTAT-SVC-NS')) {
                searchParams.append('ns', headers.get('CRYOSTAT-SVC-NS')!);
              }
              if (headers.has('CRYOSTAT-SVC-NAME')) {
                searchParams.append('name', headers.get('CRYOSTAT-SVC-NAME')!);
              }
              if (searchParams.size > 0) {
                return `${url}?${searchParams}`;
              }
              return url;
            }),
          );
        }),
      ),
      timer(0, 5000),
    ])
      .pipe(distinctUntilChanged(_.isEqual))
      .subscribe({
        next: (parts: string[]) => {
          const sessionState = parseInt(parts[0]);
          const url = parts[1];

          if (sessionState !== SessionState.CREATING_USER_SESSION) {
            return;
          }

          if (this.ws) {
            this.ws.complete();
          }

          this.ws = webSocket({
            url,
            protocol: '',
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
        },
        error: (err: Error) => this.logError('Notifications URL configuration', err),
      });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.complete();
    }
    this.login.setSessionState(SessionState.CREATING_USER_SESSION);
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
