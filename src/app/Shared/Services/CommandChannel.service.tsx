import * as React from 'react';
import { Axios } from 'axios-observable';
import { Subject, BehaviorSubject, Observable, ReplaySubject, combineLatest } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';
import { nanoid } from 'nanoid';

export class CommandChannel {

  private ws: WebSocket | null = null;
  private readonly messages = new Subject<ResponseMessage<any>>();
  private readonly ready = new BehaviorSubject<boolean>(false);
  private readonly connected = new ReplaySubject<boolean>(1);
  private readonly archiveEnabled = new ReplaySubject<boolean>(1);
  private readonly clientUrlSubject = new ReplaySubject<string>(1);
  private readonly grafanaDatasourceUrlSubject = new ReplaySubject<string>(1);
  private pingTimer: number = -1;

  constructor() {
    const apiAuthority = process.env.CONTAINER_JFR_AUTHORITY;
    if (!!apiAuthority) {
      console.log(`Using API authority ${apiAuthority}`);
    }

    Axios.get(`${apiAuthority}/clienturl`)
      .subscribe(
        (url: any) => this.clientUrlSubject.next(url.data.clientUrl),
        (err: any) => console.error('Client URL configuration', err) // TODO add toast notification
      );

    Axios.get(`${apiAuthority}/grafana_datasource_url`)
      .subscribe(
        (url: any) => this.grafanaDatasourceUrlSubject.next(url.data.grafanaDatasourceUrl),
        (err: any) => console.error('Grafana Datasource configuration', err) // TODO add toast notification
      );

    this.onResponse('disconnect').pipe(
      filter(msg => msg.status !== 0),
    ).subscribe(msg => console.warn('Command failure', JSON.stringify(msg)));

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

  connect(clientUrl: string): Observable<void> {
    const ret = new Subject<void>();
    this.ws = new WebSocket(clientUrl);

    this.ws.addEventListener('message', (ev: MessageEvent) => {
      if (typeof ev.data === 'string') {
        this.messages.next(JSON.parse(ev.data));
      }
    });

    this.ws.addEventListener('close', () => {
      this.ready.next(false);
      window.clearInterval(this.pingTimer);
      console.log('WebSocket connection lost');
    });

    this.ws.addEventListener('open', () => {
      this.ready.next(true);
      this.sendMessage('list-saved');
      this.pingTimer = window.setInterval(() => {
        this.sendMessage('ping');
      }, 10 * 1000);
      ret.complete();
    });

    this.ws.addEventListener('error', (evt: Event) => console.error(evt));

    return ret;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      delete this.ws;
    }
  }

  isReady(): Observable<boolean> {
    return this.ready.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  isArchiveEnabled(): Observable<boolean> {
    return this.archiveEnabled.asObservable();
  }

  addCloseHandler(handler: () => void): void {
    if (this.ws) {
      this.ws.addEventListener('close', handler);
    }
  }

  sendMessage(command: string, args: string[] = []): string {
    if (this.ws) {
      const id = nanoid();
      this.ws.send(JSON.stringify({ id, command, args } as CommandMessage));
      return id;
    }
    return '';
  }

  onResponse(command: string): Observable<ResponseMessage<any>> {
    return this.messages
      .asObservable()
      .pipe(
        filter(m => m.commandName === command)
      );
  }
}

export interface CommandMessage {
  command: string;
  args?: string[];
}

export interface ResponseMessage<T> {
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
