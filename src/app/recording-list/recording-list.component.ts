import { Component, OnDestroy, OnInit } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommandChannelService, ResponseMessage, StringMessage } from '../command-channel.service';
import { CreateRecordingComponent } from '../create-recording/create-recording.component';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent implements OnInit, OnDestroy {

  State = ConnectionState;
  connected: ConnectionState = ConnectionState.UNKNOWN;
  recordings: Recording[] = [];
  downloadBaseUrl: string;
  listConfig: ListConfig;

  private refresh: number;
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private svc: CommandChannelService,
    private modalSvc: BsModalService,
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
          if (r.status !== 0) {
            this.connected = ConnectionState.UNKNOWN;
          } else {
            this.connected = r.payload === 'false' ? ConnectionState.DISCONNECTED : ConnectionState.CONNECTED;
          }
          if (this.connected === ConnectionState.CONNECTED) {
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
            this.recordings = (r as ResponseMessage<Recording[]>).payload.sort((a, b) => Math.min(a.startTime, b.startTime));
          } else {
            window.clearInterval(this.refresh);
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => {
          window.clearInterval(this.refresh);
          this.recordings = [];
          this.connected = ConnectionState.DISCONNECTED;
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
        .subscribe((resp) => {
          if (resp.status === 0) {
            this.refreshList();
          }
        })
    ));

    this.subscriptions.push(
      this.svc.onResponse('connect')
        .subscribe((resp) => {
          window.clearInterval(this.refresh);
          if (resp.status === 0) {
            this.svc.sendMessage('url');
            this.connected = ConnectionState.CONNECTED;
            this.refresh = window.setInterval(() => this.refreshList(), 10000);
          } else {
            this.connected = ConnectionState.UNKNOWN;
          }
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

  openRecordingForm(): void {
    this.modalSvc.show(CreateRecordingComponent, {
      initialState: {
        svc: this.svc,
        name: '',
        events: '',
        duration: -1
      }
    });
  }
}

export interface Recording {
  id: number;
  name: string;
  state: string;
  duration: number;
  startTime: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}

enum ConnectionState {
  UNKNOWN,
  CONNECTED,
  DISCONNECTED,
}
