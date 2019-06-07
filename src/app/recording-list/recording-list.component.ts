import { Component, OnDestroy, OnInit } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommandChannelService, ResponseMessage, StringMessage } from '../command-channel.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
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
  reportsBaseUrl: string;
  downloadBaseUrl: string;
  listConfig: ListConfig;

  private refresh: number;
  private readonly subscriptions: Subscription[] = [];
  private readonly refreshInterval: number = 30 * 1000;

  constructor(
    private svc: CommandChannelService,
    private modalSvc: BsModalService,
  ) {
    this.listConfig = {
      useExpandItems: true
    };
  }

  set autoRefreshEnabled(enabled: boolean) {
    window.clearInterval(this.refresh);
    if (enabled) {
      this.refreshList();
      this.refresh = window.setInterval(() => this.refreshList(), this.refreshInterval);
    }
  }

  get autoRefreshEnabled(): boolean {
    return this.refresh != null;
  }

  ngOnInit(): void {
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
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('list')
        .subscribe(r => {
          const msg = (r as ResponseMessage<Recording[]>);
          if (msg.status === 0) {
            const newRecordings = (r as ResponseMessage<Recording[]>).payload;

            newRecordings.forEach(nr => {
              // Ports reported by container-jmx-client will be the ports that it binds
              // within its container, but we'll override that to port 80 for
              // OpenShift/Minishift demo deployments
              const downloadUrl: URL = new URL(nr.downloadUrl);
              downloadUrl.port = '80';
              nr.downloadUrl = downloadUrl.toString();

              const reportUrl: URL = new URL(nr.reportUrl);
              reportUrl.port = '80';
              nr.reportUrl = reportUrl.toString();
            });

            this.recordings
              .filter(i => (i as any).expanded)
              .map(i => i.id)
              .forEach(i => newRecordings.filter(nr => nr.id === i).forEach(nr => (nr as any).expanded = true));

            this.recordings = newRecordings.sort((a, b) => Math.min(a.startTime, b.startTime));
          } else {
            this.autoRefreshEnabled = false;
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => {
          this.autoRefreshEnabled = false;
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
          if (resp.status === 0) {
            this.connected = ConnectionState.CONNECTED;
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
    this.modalSvc.show(ConfirmationDialogComponent, {
      initialState: {
        destructive: true,
        title: 'Confirm Deletion',
        message: 'Are you sure you would like to delete this recording? ' +
        'Once deleted, recordings can not be retrieved and the data is lost.'
      }
    }).content.onAccept().subscribe(() => this.svc.sendMessage('delete', [ name ]));
  }

  stop(name: string): void {
    this.modalSvc.show(ConfirmationDialogComponent, {
      initialState: {
        destructive: true,
        title: 'Confirm Stoppage',
        message: 'Are you sure you would like to stop this recording?'
      }
    }).content.onAccept().subscribe(() => this.svc.sendMessage('stop', [ name ]));
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
  downloadUrl: string;
  reportUrl: string;
}

enum ConnectionState {
  UNKNOWN,
  CONNECTED,
  DISCONNECTED,
}
