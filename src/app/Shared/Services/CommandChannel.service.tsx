import { from, Subject, BehaviorSubject, Observable, ReplaySubject, combineLatest } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { concatMap, distinctUntilChanged, filter, first, map, tap } from 'rxjs/operators';
import { ApiService } from './Api.service';
import { Notifications } from '@app/Notifications/Notifications';
import { nanoid } from 'nanoid';

export class CommandChannel {

  private ws: WebSocket | null = null;
  private readonly apiSvc: ApiService;
  private readonly messages = new Subject<ResponseMessage<any>>();
  private readonly ready = new BehaviorSubject<boolean>(false);
  private readonly connected = new ReplaySubject<boolean>(1);
  private readonly archiveEnabled = new ReplaySubject<boolean>(1);
  private readonly clientUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDatasourceUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDashboardUrlSubject = new ReplaySubject<string>(1);
  private pingTimer: number = -1;

  constructor(apiSvc: ApiService, private readonly notifications: Notifications) {
    this.apiSvc = apiSvc;

    fromFetch(`${this.apiSvc.authority}/api/v1/clienturl`)
      .pipe(concatMap(resp => from(resp.json())))
      .subscribe(
        (url: any) => this.clientUrlSubject.next(url.clientUrl),
        (err: any) => this.logError('Client URL configuration', err)
      );

    fromFetch(`${this.apiSvc.authority}/api/v1/grafana_datasource_url`)
      .pipe(concatMap(resp => from(resp.json())))
      .subscribe(
        (url: any) => this.grafanaDatasourceUrlSubject.next(url.grafanaDatasourceUrl),
        (err: any) => this.logError('Grafana Datasource configuration', err)
      );

    fromFetch(`${this.apiSvc.authority}/api/v1/grafana_dashboard_url`)
      .pipe(concatMap(resp => from(resp.json())))
      .subscribe(
        (url: any) => this.grafanaDashboardUrlSubject.next(url.grafanaDashboardUrl),
        (err: any) => this.logError('Grafana Dashboard configuration', err)
      );

    this.onResponse('disconnect').pipe(
      filter(msg => msg.status !== 0),
    ).subscribe(msg => this.logError('Command failure', msg));

    this.onResponse('list-saved').pipe(
      first(),
      map(msg => msg.status === 0)
    ).subscribe(listSavedEnabled => this.archiveEnabled.next(listSavedEnabled));

    // FIXME handle the case of a failed 'connect' command
    this.onResponse('is-connected').subscribe(c => this.connected.next(c.status === 0 && c.payload !== 'false'));
    this.onResponse('disconnect').pipe(filter(m => m.status === 0)).subscribe(() => this.connected.next(false));
    this.onResponse('connect').pipe(filter(m => m.status === 0)).subscribe(() => this.connected.next(true));

    this.isReady().pipe(
      filter(ready => !!ready)
    ).subscribe(ready => {
      this.sendMessage('is-connected');
      this.sendMessage('list-saved');
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
          subprotocol = `base64url.bearer.authorization.containerjfr.${btoa(auths[0])}`;
        } else if (auths[1] === 'Basic') {
          subprotocol = `basic.authorization.containerjfr.${auths[0]}`;
        }
        this.ws = new WebSocket(clientUrl, subprotocol);

        this.ws.addEventListener('message', (ev: MessageEvent) => {
          if (typeof ev.data === 'string') {
            this.messages.next(JSON.parse(ev.data));
          }
        });

        this.ws.addEventListener('error', (evt: Event) => this.logError('WebSocket error', evt));

        this.ws.addEventListener('close', () => {
          this.ready.next(false);
          window.clearInterval(this.pingTimer);
          this.notifications.info('WebSocket connection lost');
        });

        this.ws.addEventListener('open', () => {
          this.pingTimer = window.setInterval(() => {
            this.sendMessage('ping');
          }, 10 * 1000);
          this.ready.next(true);
        });

        ret.complete();
      });
    return ret;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      delete this.ws;
    }
  }

  isReady(): Observable<boolean> {
    return this.ready.asObservable().pipe(distinctUntilChanged());
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable().pipe(distinctUntilChanged());
  }

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable().pipe(distinctUntilChanged());
  }

  addCloseHandler(handler: () => void): void {
    if (this.ws) {
      this.ws.addEventListener('close', handler);
    }
  }

  sendMessage(command: string, args: string[] = [], id: string = this.createMessageId()): Observable<string> {
    const subj = new Subject<string>();
    this.ready.pipe(
      first(),
      map(ready => ready ? id : '')
    ).subscribe(i => {
      if (!!i && this.ws) {
        this.ws.send(JSON.stringify({ id, command, args }));
      } else if (this.ws) {
        this.logError('Attempted to send message when command channel was not ready', { id, command, args });
      } else {
        this.logError('Attempted to send message when command channel was not initialized', { id, command, args });
      }
      subj.next(i);
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
    console.error(err);
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

export interface ExceptionMessage extends ResponseMessage<{ commandName: string, exception: string }> { }

export function isExceptionMessage(m: ResponseMessage<any>): m is ExceptionMessage {
  return m.status < 0
    && m.payload != null
    && m.payload.commandName != null && typeof m.payload.commandName === 'string'
    && m.payload.exception != null && typeof m.payload.exception === 'string';
}
