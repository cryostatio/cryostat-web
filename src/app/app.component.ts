import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommandChannelService, ListMessage, ResponseMessage, StringMessage } from './command-channel.service';
import { JvmTarget } from './connect/connect-button.component';
import { Recording } from './recording-list/recording-list.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('textarea') textarea: ElementRef;
  connected = false;
  texts: string[] = [];
  recordings: Recording[] = [];
  hosts: JvmTarget[] = [];
  refreshTimer: number;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('list')
        .subscribe(r => this.recordings = (r as ResponseMessage<Recording[]>).payload)
    );

    [
      'dump',
      'start',
      'snapshot',
      'delete',
      'stop',
    ].forEach(cmd => this.subscriptions.push(
      this.svc.onResponse(cmd)
        .subscribe(() => this.updateList())
    ));

    this.subscriptions.push(
      this.svc.onResponse('is-connected')
        .subscribe(r => {
          this.connected = (r as StringMessage).payload === 'true';
          this.updateList();
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('port-scan')
        .subscribe(r => this.hosts = (r as ListMessage).payload)
    );

    this.subscriptions.push(
      this.svc.onResponse('connect')
        .subscribe(() => {
          this.connected = true;
          this.updateList();
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => this.clearState())
    );

    this.subscriptions.push(
      this.svc.isReady()
        .pipe(
          filter(s => !!s)
        )
        .subscribe(() => {
          this.refreshTimer = window.setInterval(() => {
            this.updateList();
          }, 10000);
          this.svc.addCloseHandler(() => {
            window.clearInterval(this.refreshTimer);
            this.clearState();
          });
          this.svc.sendMessage('is-connected');
          this.svc.sendMessage('port-scan');
        })
    );
  }

  ngOnDestroy(): void {
    window.clearInterval(this.refreshTimer);
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  clearState(): void {
    this.connected = false;
    this.recordings = [];
  }

  updateList(): void {
    if (!this.connected) {
      return;
    }
    this.svc.sendMessage('list');
  }

  delete(recordingName: string): void {
    this.svc.sendMessage('delete', [ recordingName ]);
  }

  stop(recordingName: string): void {
    this.svc.sendMessage('stop', [ recordingName ]);
  }

}
