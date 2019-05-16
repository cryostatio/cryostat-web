import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { JvmTarget } from './connect/connect-button.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  ws: WebSocket;
  connected = false;
  wsConnected = false;
  texts: string[] = [];
  recordings: Recording[] = [];
  downloadBaseUrl = '';
  hosts: JvmTarget[] = [];
  refreshTimer: number;
  pingTimer: number;
  @ViewChild('textarea') textarea: ElementRef;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.wsConnected = false;
    this.texts = [];
    this.http.get('/clienturl')
      .subscribe(
        (url: string) => {
          console.log('Client URL', url);
          this.wsConnect(url);
        },
        (err: any) => {
          console.log(err);
        }
      );
  }

  ngOnDestroy(): void {
    window.clearInterval(this.refreshTimer);
    window.clearInterval(this.pingTimer);
    this.ws.close();
  }

  wsConnect(jmxClientUrl: string): void {
    this.ws = new WebSocket(jmxClientUrl);

    this.ws.onopen = () => {
      this.recordings = [];
      this.texts = [];
      this.downloadBaseUrl = '';
      this.wsConnected = true;
      this.sendMessage({ command: 'is-connected' });
      this.sendMessage({ command: 'port-scan' });
      this.refreshTimer = window.setInterval(() => {
        if (!this.wsConnected) {
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
      this.wsConnected = false;
      this.clearState();
    };
    this.ws.onerror = () => this.onMessage(JSON.stringify({ message: 'WebSocket error' }));
    this.ws.onmessage = (ev: MessageEvent) => this.onMessage(ev.data);
  }

  sendMessage(message: CommandMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  clearState(): void {
    this.connected = false;
    this.recordings = [];
    this.downloadBaseUrl = '';
  }

  updateList(): void {
    if (!this.connected) {
      return;
    }
    this.sendMessage({ command: 'list' });
    this.updateUrl();
  }

  updateUrl(): void {
    if (!this.connected) {
      return;
    }
    this.sendMessage({ command: 'url' });
  }

  delete(recordingName: string): void {
    this.sendMessage({ command: 'delete', args: [ recordingName ] });
  }

  stop(recordingName: string): void {
    this.sendMessage({ command: 'stop', args: [ recordingName ] });
  }

  onMessage(message: any): void {
    if (typeof message === 'string') {
      const rec: ResponseMessage<any> = JSON.parse(message);

      if (rec.status === 0) {
        if (rec.commandName === 'list') {
          this.recordings = (rec as ResponseMessage<Recording[]>).payload;
          return;
        }

        if (rec.commandName === 'dump'
          || rec.commandName === 'start'
          || rec.commandName === 'snapshot'
          || rec.commandName === 'delete'
          || rec.commandName === 'stop') {
          this.updateList();
        }

        if (rec.commandName === 'url') {
          const url: URL = new URL((rec as StringMessage).payload);
          url.protocol = 'http:';
          // Port reported by container-jmx-client will be the port that it binds
          // within its container, but we'll override that to port 80 for
          // OpenShift/Minishift demo deployments
          url.port = '80';
          this.downloadBaseUrl = url.toString();
          return;
        }

        if (rec.commandName === 'ping') {
          return;
        }

        if (rec.commandName === 'is-connected') {
          this.connected = (rec as StringMessage).payload === 'true';
          this.updateList();
          return;
        }

        if (rec.commandName === 'port-scan') {
          this.hosts = (rec as ListMessage).payload;
          return;
        }

        if (rec.commandName === 'connect') {
          this.connected = true;
          this.updateList();
        }

        if (rec.commandName === 'disconnect') {
          this.clearState();
        }
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
