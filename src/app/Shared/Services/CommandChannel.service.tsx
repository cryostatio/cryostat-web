import { Notifications } from '@app/Notifications/Notifications';
import { nanoid } from 'nanoid';
import { BehaviorSubject, combineLatest, from, Observable, ReplaySubject, Subject, forkJoin, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { concatMap, filter, first, map } from 'rxjs/operators';
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
  private readonly targetSubject = new ReplaySubject<string>(1);

  constructor(apiSvc: ApiService, private readonly notifications: Notifications) {
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
    
    this.onResponse('list-saved').pipe(
      first(),
      map(msg => msg.status === 0)
    ).subscribe(listSavedEnabled => this.archiveEnabled.next(listSavedEnabled));

    this.isReady().pipe(
      filter(ready => !!ready)
    ).subscribe(() => {
      this.sendControlMessage('list-saved');
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

  isConnected(): Observable<boolean> {
    return this.target().pipe(map(t => !!t));
  }

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable();
  }

  setTarget(targetId: string): void {
    this.targetSubject.next(targetId);
  }

  target(): Observable<string> {
    return this.targetSubject.asObservable();
  }

  // "control" messages, which do not operate upon a Target JVM
  sendControlMessage(command: string, args: string[] = [], id: string = this.createMessageId()): Observable<string> {
    const subj = new Subject<string>();
    this.ready.pipe(
      first(),
      map(ready => ready ? id : '')
    ).subscribe(i => {
      if (!!i && this.ws) {
        this.ws.next({ id, command, args });
      } else if (this.ws) {
        this.logError('Attempted to send control message when command channel was not ready', { id, command, args });
      } else {
        this.logError('Attempted to send control message when command channel was not initialized', { id, command, args });
      }
      subj.next(i);
    });
    return subj.asObservable();
  }

  // "targeted" messages, ie those which operate upon a specific Target JVM
  sendMessage(command: string, args: string[] = [], id: string = this.createMessageId()): Observable<string> {
    const subj = new Subject<string>();
    combineLatest(this.target(), this.ready.pipe(
      first(),
      map(ready => ready ? id : '')
    )).subscribe(([target, id]) => {
      if (!!id && this.ws) {
        this.ws.next({ id, command, args: [target, ...args] });
      } else if (this.ws) {
        this.logError('Attempted to send message when command channel was not ready', { id, command, args });
      } else {
        this.logError('Attempted to send message when command channel was not initialized', { id, command, args });
      }
      subj.next(id);
    });
    return subj.asObservable();
  }

  createMessageId(): string {
    return nanoid();
  }

  onResponse(command: string): Observable<ResponseMessage<any>> {
    return this.messages
      .asObservable()
      .pipe(
        filter(m => m.commandName === command)
      );
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
