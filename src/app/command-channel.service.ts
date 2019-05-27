import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { NotificationService, NotificationType } from 'patternfly-ng/notification';

@Injectable()
export class CommandChannelService implements OnDestroy {
  private ws: WebSocket;
  private readonly messages = new Subject<ResponseMessage<any>>();
  private readonly ready = new BehaviorSubject<boolean>(false);
  private readonly clientUrlSubject = new ReplaySubject<string>(1);
  private closeHandlers: (() => void)[] = [];
  private pingTimer: number;

  constructor(
    private http: HttpClient,
    private notifications: NotificationService,
  ) {
    this.http.get('/clienturl')
      .subscribe(
        (url: ({ clientUrl: string })) => {
          this.connect(url.clientUrl);
          this.clientUrlSubject.next(url.clientUrl);
        },
        (err: any) => {
          alert(err);
          console.log(err);
        }
      );
    this.notifications.setDelay(15000);
  }

  clientUrl(): Observable<string> {
    return this.clientUrlSubject.asObservable();
  }

  connect(clientUrl: string): void {
    this.ws = new WebSocket(clientUrl);
    // TODO this.ws.onerror = doSomethingWithErrors();
    this.ws.onclose = () => this.onSocketClose();
    this.ws.onopen = () => {

      this.pingTimer = window.setInterval(() => {
        this.sendMessage('ping');
      }, 60000);

      this.addCloseHandler(() => this.ready.next(false));
      this.addCloseHandler(() => window.clearInterval(this.pingTimer));

      this.ready.next(true);
    };
    this.ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') {
        const msg: ResponseMessage<any> = JSON.parse(ev.data);
        this.messages.next(msg);
        if (msg.status !== 0 && msg.commandName !== 'disconnect') {
          this.notifications.message(
            NotificationType.WARNING, msg.commandName, msg.payload, false, null, null
          );
        }
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      delete this.ws;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  isReady(): Observable<boolean> {
    return this.ready.asObservable();
  }

  addCloseHandler(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  sendMessage(command: string, args: string[] = []): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({ command, args } as CommandMessage));
    }
  }

  onResponse(command: string): Observable<ResponseMessage<any>> {
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
