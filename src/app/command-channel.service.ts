import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class CommandChannelService implements OnDestroy {
  private ws: WebSocket;
  private readonly messages = new Subject<any>();
  private readonly ready = new BehaviorSubject<boolean>(false);
  private closeHandlers: (() => void)[] = [];
  private pingTimer: number;

  constructor(
    private http: HttpClient
  ) {
    this.init();
  }

  private init(): void {
    this.http.get('/clienturl')
      .subscribe(
        (url: any) => {
          this.ws = new WebSocket(url.clientUrl);
          this.ws.onopen = () => {
            this.ws.onclose = () => this.onSocketClose();
            // TODO this.ws.onerror = doSomethingWithErrors();

            this.pingTimer = window.setInterval(() => {
              this.sendMessage('ping');
            }, 60000);

            this.addCloseHandler(() => this.ready.next(false));
            this.addCloseHandler(() => window.clearInterval(this.pingTimer));

            this.ws.onmessage = (ev: MessageEvent) => {
              if (typeof ev.data === 'string') {
                this.messages.next(JSON.parse(ev.data));
              }
            };

            this.ready.next(true);
          };
        },
        (err: any) => {
          alert(err);
          console.log(err);
        }
      );
  }

  ngOnDestroy(): void {
    this.ws.close();
  }

  isReady(): Observable<boolean> {
    return this.ready.asObservable();
  }

  addCloseHandler(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  sendMessage(command: string, args: string[] = []): void {
    this.ws.send(JSON.stringify({ command, args } as CommandMessage));
  }

  onResponse(command: string): Observable<any> {
    return this.messages
      .asObservable()
      .pipe(
        filter(m => m.commandName === command)
      );
  }

  private onSocketClose(): void {
    this.closeHandlers.forEach(h => h.call(this));
    this.closeHandlers = [];
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
