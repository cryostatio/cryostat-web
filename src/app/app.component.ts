import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { JvmTarget } from './connect/connect-button.component';
import { Recording } from './recording-list/recording-list.component';
import { CommandChannelService, ResponseMessage, StringMessage, ListMessage } from './command-channel.service';
import { filter, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  connected = false;
  texts: string[] = [];
  recordings: Recording[] = [];
  downloadBaseUrl = '';
  hosts: JvmTarget[] = [];
  refreshTimer: number;
  @ViewChild('textarea') textarea: ElementRef;

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
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

        this.svc.onResponse('list')
          .subscribe(r => this.recordings = (r as ResponseMessage<Recording[]>).payload);

        [
          'dump',
          'start',
          'snapshot',
          'delete',
          'stop',
        ].forEach(cmd => this.svc.onResponse(cmd)
          .subscribe(() => this.updateList()));
      });

    this.svc.onResponse('url')
      .subscribe(r => {
        const url: URL = new URL((r as StringMessage).payload);
        url.protocol = 'http:';
        // Port reported by container-jmx-client will be the port that it binds
        // within its container, but we'll override that to port 80 for
        // OpenShift/Minishift demo deployments
        url.port = '80';
        this.downloadBaseUrl = url.toString();
      });

    this.svc.onResponse('is-connected')
      .subscribe(r => {
        this.connected = (r as StringMessage).payload === 'true';
        this.updateList();
      });

    this.svc.onResponse('port-scan')
      .subscribe(r => this.hosts = (r as ListMessage).payload);

    this.svc.onResponse('connect')
      .subscribe(() => {
        this.connected = true;
        this.updateList();
      });

    this.svc.onResponse('disconnect')
      .subscribe(() => this.clearState());
  }

  ngOnDestroy(): void {
    window.clearInterval(this.refreshTimer);
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
    this.svc.sendMessage('list');
    this.updateUrl();
  }

  updateUrl(): void {
    if (!this.connected) {
      return;
    }
    this.svc.sendMessage('url');
  }

  delete(recordingName: string): void {
    this.svc.sendMessage('delete', [ recordingName ]);
  }

  stop(recordingName: string): void {
    this.svc.sendMessage('stop', [ recordingName ]);
  }

}
