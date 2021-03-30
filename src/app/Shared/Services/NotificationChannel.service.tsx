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
import { Notifications } from '@app/Notifications/Notifications';
import { BehaviorSubject, combineLatest, from, Observable, Subject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { concatMap, filter, first, map } from 'rxjs/operators';
import { Base64 } from 'js-base64';
import { ApiService } from './Api.service';

const NOTIFICATION_CATEGORY = 'WS_CLIENT_ACTIVITY';

export class NotificationChannel {

  private ws: WebSocketSubject<any> | null = null;
  private readonly _messages = new Subject<NotificationMessage>();
  private readonly _ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly apiSvc: ApiService,
    private readonly notifications: Notifications
  ) {
    this.messages(NOTIFICATION_CATEGORY).subscribe(v => {
      const addr = Object.keys(v.message)[0];
      const status = v.message[addr];
      notifications.info('WebSocket Client Activity', `Client at ${addr} ${status}`);
    });

    const clientUrl = fromFetch(`${this.apiSvc.authority}/api/v1/clienturl`)
      .pipe(
        concatMap(resp => from(resp.json())),
        map((url: any): string => url.clientUrl)
      );
    combineLatest(clientUrl, this.apiSvc.getToken(), this.apiSvc.getAuthMethod())
      .pipe(first())
      .subscribe(
        (parts: string[]) => {
          const url = parts[0];
          const token = parts[1];
          const authMethod = parts[2];
          let subprotocol: string | undefined = undefined;
          if (authMethod === 'Bearer') {
            subprotocol = `base64url.bearer.authorization.cryostat.${Base64.encodeURL(token)}`;
          } else if (authMethod === 'Basic') {
            subprotocol = `basic.authorization.cryostat.${token}`;
          }

          this.ws = webSocket({
            url,
            protocol: subprotocol,
            openObserver: {
              next: () => {
                this._ready.next(true);
              }
            },
            closeObserver: {
              next: () => {
                this._ready.next(false);
                this.notifications.info('WebSocket connection lost');
              }
            }
          });

          this.ws.subscribe(
            v => this._messages.next(v),
            err => this.logError('WebSocket error', err)
          );
        },
        (err: any) => this.logError('Client URL configuration', err)
      );
  }

  isReady(): Observable<boolean> {
    return this._ready.asObservable();
  }

  messages(category: string): Observable<NotificationMessage> {
    return this._messages.asObservable().pipe(filter(msg => msg.meta.category === category));
  }

  private logError(title: string, err: any): void {
    window.console.error(err);
    this.notifications.danger(title, JSON.stringify(err));
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
