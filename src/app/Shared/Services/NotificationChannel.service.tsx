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
import { BehaviorSubject, combineLatest, from, Observable, ReplaySubject, Subject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { concatMap, first } from 'rxjs/operators';
import { ApiService } from './Api.service';

export class NotificationChannel {

  private ws: WebSocketSubject<any> | null = null;
  private readonly messages = new Subject<NotificationMessage>();
  private readonly ready = new BehaviorSubject<boolean>(false);
  private readonly clientUrlSubject = new ReplaySubject<string>(1);

  constructor(
    private readonly apiSvc: ApiService,
    private readonly notifications: Notifications
  ) {
    fromFetch(`${this.apiSvc.authority}/api/v1/clienturl`)
      .pipe(concatMap(resp => from(resp.json())))
      .subscribe(
        (url: any) => this.clientUrlSubject.next(url.clientUrl),
        (err: any) => this.logError('Client URL configuration', err)
      );

    this.clientUrl().pipe(
      first()
    ).subscribe(url => this.connect(url));
  }

  clientUrl(): Observable<string> {
    return this.clientUrlSubject.asObservable();
  }

  connect(clientUrl: string): Observable<void> {
    const ret = new Subject<void>();
    combineLatest(this.apiSvc.getToken(), this.apiSvc.getAuthMethod())
      .pipe(
        first(),
      )
      .subscribe(auths => {
        let subprotocol: string | undefined = undefined;
        if (auths[1] === 'Bearer') {
          subprotocol = `base64url.bearer.authorization.containerjfr.${window.btoa(auths[0])}`;
        } else if (auths[1] === 'Basic') {
          subprotocol = `basic.authorization.containerjfr.${auths[0]}`;
        }

        this.ws = webSocket({
          url: clientUrl,
          protocol: subprotocol,
          openObserver: {
            next: () => {
              this.ready.next(true);
            }
          },
          closeObserver: {
            next: () => {
              this.ready.next(false);
              this.notifications.info('WebSocket connection lost');
            }
          }
        });

        this.ws.subscribe(
          v => this.messages.next(v),
          err => this.logError('WebSocket error', err)
        );

        ret.complete();
      });
    return ret;
  }

  isReady(): Observable<boolean> {
    return this.ready.asObservable();
  }

  private logError(title: string, err: any): void {
    window.console.error(err);
    this.notifications.danger(title, JSON.stringify(err));
  }
}

export interface NotificationMessage {
}
