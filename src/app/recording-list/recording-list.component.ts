import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommandChannelService, ResponseMessage, StringMessage } from '../command-channel.service';
import { ListConfig } from 'patternfly-ng/list';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent implements OnInit, OnDestroy {

  connected = false;
  recordings: Recording[] = [];
  downloadBaseUrl: string;
  listConfig: ListConfig;

  private refresh: number;
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private svc: CommandChannelService,
  ) {
    this.listConfig = {
      useExpandItems: true
    };
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('url')
        .subscribe(r => {
          if (r.status === 0) {
            const url: URL = new URL((r as StringMessage).payload);
            url.protocol = 'http:';
            // Port reported by container-jmx-client will be the port that it binds
            // within its container, but we'll override that to port 80 for
            // OpenShift/Minishift demo deployments
            url.port = '80';
            this.downloadBaseUrl = url.toString();
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('is-connected')
        .subscribe(r => {
          this.connected = r.payload === 'true';
          if (this.connected && r.status === 0) {
            this.refreshList();
            window.clearInterval(this.refresh);
            this.refresh = window.setInterval(() => this.refreshList(), 10000);
            this.svc.sendMessage('url');
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('list')
        .subscribe(r => {
          const msg = (r as ResponseMessage<Recording[]>);
          if (msg.status === 0) {
            this.recordings = (r as ResponseMessage<Recording[]>).payload;
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(r => {
          this.recordings = [];
          this.connected = false;
        })
    );

    [
      'connect',
      'dump',
      'start',
      'snapshot',
      'delete',
      'stop',
    ].forEach(cmd => this.subscriptions.push(
      this.svc.onResponse(cmd)
        .subscribe(() => this.refreshList())
    ));

    this.subscriptions.push(
      this.svc.onResponse('connect')
        .subscribe(() => {
          this.connected = true;
          window.clearInterval(this.refresh);
          this.refresh = window.setInterval(() => this.refreshList(), 10000);
        })
    );

    this.svc.isReady()
      .pipe(
        filter(ready => !!ready)
      )
      .subscribe(ready => {
        if (ready) {
          this.svc.sendMessage('is-connected');
        } else {
          window.clearInterval(this.refresh);
        }
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    window.clearInterval(this.refresh);
  }

  refreshList(): void {
    this.svc.sendMessage('list');
  }

  delete(name: string): void {
    this.svc.sendMessage('delete', [ name ]);
  }

  stop(name: string): void {
    this.svc.sendMessage('stop', [ name ]);
  }
}

export interface Recording {
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
