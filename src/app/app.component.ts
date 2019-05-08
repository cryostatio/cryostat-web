import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  ws: WebSocket;
  connected = false;
  texts: string[] = [];
  recordings: Recording[] = [];
  downloadBaseUrl = '';
  refreshTimer: number;
  pingTimer: number;
  @ViewChild('textarea') textarea: ElementRef;

  ngOnInit(): void {
    this.connected = false;
    this.texts = [];

    this.wsConnect();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.refreshTimer);
    window.clearInterval(this.pingTimer);
    this.ws.close();
  }

  wsConnect(): void {
    this.ws = new WebSocket('ws://jmx-client:9090/command');

    this.ws.onopen = () => {
      this.recordings = [];
      this.texts = [];
      this.downloadBaseUrl = '';
      this.connected = true;
      this.sendMessage({ command: 'connect', args: [ 'jmx-client' ] });
      this.sendMessage({ command: 'url' });
      this.sendMessage({ command: 'help' });
      this.updateList();
      this.refreshTimer = window.setInterval(() => {
        if (!this.connected) {
          window.clearInterval(this.refreshTimer);
          return;
        }
        this.updateList();
      }, 10000);
      this.pingTimer = window.setInterval(() => {
        this.sendMessage({ command: 'ping' });
      }, 60000);
    };
    this.ws.onclose = () => {
      window.clearInterval(this.refreshTimer);
      window.clearInterval(this.pingTimer);
      this.connected = false;
      this.recordings = [];
      this.downloadBaseUrl = '';
    };
    this.ws.onerror = () => this.onMessage(JSON.stringify({ message: 'WebSocket error' }));
    this.ws.onmessage = (ev: MessageEvent) => this.onMessage(ev.data);
  }

  sendMessage(message: CommandMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  updateList(): void {
    this.sendMessage({ command: 'list' });
  }

  delete(recordingName: string): void {
    this.sendMessage({ command: 'delete', args: [ recordingName ] });
  }

  onMessage(message: any): void {
    if (typeof message === 'string') {
      const rec: ResponseMessage<any> = JSON.parse(message);

      if (rec.commandName === 'list') {
        this.recordings = (rec as ResponseMessage<Recording[]>).payload;
        return;
      }

      if (rec.commandName === 'dump' || rec.commandName === 'start' || rec.commandName === 'snapshot' || rec.commandName === 'delete') {
        this.updateList();
      }

      if (rec.commandName === 'url') {
        this.downloadBaseUrl = (rec as StringMessage).payload;
        return;
      }

      if (rec.commandName === 'ping') {
        return;
      }

      let msg: string;
      if (isStringMessage(rec)) {
        msg = rec.payload;
      } else if (isListMessage(rec) || isFailureMessage(rec)) {
        msg = JSON.stringify(rec.payload);
      } else if (isFailureMessage(rec)) {
        msg  = rec.payload;
      } else if (isExceptionMessage(rec)) {
        msg = rec.payload.exception;
      } else if (isSuccessMessage(rec)) {
        msg = 'OK';
      } else {
        console.log('Unrecognized message format', rec);
        msg = rec.payload;
      }
      this.texts.push(msg);
      setTimeout(() => this.textarea.nativeElement.scrollTop = this.textarea.nativeElement.scrollHeight);
    }
  }
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

export interface CommandMessage {
  command: string;
  args?: string[];
}

interface Recording {
  id: number;
  name: string;
  state: string;
  duration: number;
  startTime: Date;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}
