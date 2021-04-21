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
import { BehaviorSubject, combineLatest, from, Observable, ReplaySubject, Subject, forkJoin, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { concatMap, first } from 'rxjs/operators';
import { Base64 } from 'js-base64';
import { ApiService } from './Api.service';

export class CommandChannel {

  private ws: WebSocketSubject<any> | null = null;
  private readonly apiSvc: ApiService;
  private readonly messages = new Subject<ResponseMessage<any>>();
  private readonly ready = new BehaviorSubject<boolean>(false);
  private readonly archiveEnabled = new ReplaySubject<boolean>(1);
  private readonly clientUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDatasourceUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDashboardUrlSubject = new ReplaySubject<string>(1);

  constructor(
    apiSvc: ApiService,
    private readonly notifications: Notifications
  ) {
    this.apiSvc = apiSvc;

    fromFetch(`${this.apiSvc.authority}/api/v1/clienturl`)
      .pipe(concatMap(resp => from(resp.json())))
      .subscribe(
        (url: any) => this.clientUrlSubject.next(url.clientUrl),
        (err: any) => this.logError('Client URL configuration', err)
      );

    const getDatasourceURL = fromFetch(`${this.apiSvc.authority}/api/v1/grafana_datasource_url`)
    .pipe(concatMap(resp => from(resp.json())));
    const getDashboardURL = fromFetch(`${this.apiSvc.authority}/api/v1/grafana_dashboard_url`)
    .pipe(concatMap(resp => from(resp.json())));

    fromFetch(`${this.apiSvc.authority}/health`)
      .pipe(
        concatMap(resp => from(resp.json())),
        concatMap((jsonResp: any) => {
          if (jsonResp.dashboardAvailable && jsonResp.datasourceAvailable) {
            return forkJoin([getDatasourceURL, getDashboardURL]);
          } else {
            const missing: string[] = [];
            if (!jsonResp.dashboardAvailable) {
              missing.push('dashboard URL');
            }
            if (!jsonResp.datasourceAvailable) {
              missing.push('datasource URL');
            }
            const message = missing.join(', ') + ' unavailable';
            return throwError(message);
          }}))
      .subscribe(
        (url: any) => {
          this.grafanaDatasourceUrlSubject.next(url[0].grafanaDatasourceUrl);
          this.grafanaDashboardUrlSubject.next(url[1].grafanaDashboardUrl);
        },
        err => this.logError('Grafana configuration not found', err)
      );

    apiSvc.doGet('recordings').subscribe(() => {
      this.archiveEnabled.next(true);
    }, () => {
      this.archiveEnabled.next(false);
    });

    this.clientUrl().pipe(
      first()
    ).subscribe(url => this.connect(url));
  }

  clientUrl(): Observable<string> {
    return this.clientUrlSubject.asObservable();
  }

  grafanaDatasourceUrl(): Observable<string> {
    return this.grafanaDatasourceUrlSubject.asObservable();
  }

  grafanaDashboardUrl(): Observable<string> {
    return this.grafanaDashboardUrlSubject.asObservable();
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
          subprotocol = `base64url.bearer.authorization.containerjfr.${Base64.encodeURL(auths[0])}`;
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

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable();
  }

  private logError(title: string, err: any): void {
    window.console.error(err);
    this.notifications.danger(title, JSON.stringify(err));
  }
}

export interface CommandMessage {
  id: string;
  command: string;
  args?: string[];
}

export interface ResponseMessage<T> {
  id?: string;
  status: number;
  commandName: string;
  payload: T;
}

export interface SuccessMessage extends ResponseMessage<void> { }

export function isSuccessMessage(m: ResponseMessage<any>): m is SuccessMessage {
  return m.status === 0;
}

export interface StringMessage extends ResponseMessage<string> { }

export function isStringMessage(m: ResponseMessage<any>): m is StringMessage {
  return m.status === 0 && typeof m.payload === 'string';
}

export interface ListMessage extends ResponseMessage<any[]> { }

export function isListMessage(m: ResponseMessage<any>): m is ListMessage {
  return m.status === 0 && Array.isArray(m.payload);
}

export interface FailureMessage extends ResponseMessage<string> { }

export function isFailureMessage(m: ResponseMessage<any>): m is FailureMessage {
  return m.status < 0 && typeof m.payload === 'string';
}

export interface ExceptionMessage extends ResponseMessage<{ commandName: string; exception: string }> { }

export function isExceptionMessage(m: ResponseMessage<any>): m is ExceptionMessage {
  return m.status < 0
    && m.payload != null
    && m.payload.commandName != null && typeof m.payload.commandName === 'string'
    && m.payload.exception != null && typeof m.payload.exception === 'string';
}
