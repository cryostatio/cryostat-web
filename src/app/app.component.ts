import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  ws: WebSocket;
  connected: boolean;
  texts: string[];
  @ViewChild('textarea') textarea: ElementRef;

  ngOnInit(): void {
    this.connected = false;
    this.texts = [];

    this.wsConnect();
  }

  wsConnect(): void {
    this.ws = new WebSocket('ws://jmx-client:9090/command');

    this.ws.onopen = () => this.connected = true;
    this.ws.onclose = () => this.connected = false;
    this.ws.onerror = () => this.onMessage(JSON.stringify({ message: 'WebSocket error' }));
    this.ws.onmessage = (ev: MessageEvent) => this.onMessage(ev.data);
  }

  ngOnDestroy(): void {
    this.ws.close();
  }

  sendMessage(message: CommandMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  onMessage(message: any): void {
    if (typeof message === 'string') {
      const rec: Message = JSON.parse(message);
      this.texts.push(rec.message);
      setTimeout(() => this.textarea.nativeElement.scrollTop = this.textarea.nativeElement.scrollHeight);
    }
  }
}

export interface Message {
  status: number;
  message: string;
}

export interface CommandMessage {
  command: string;
  args: string[];
}
