import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { isEqual } from 'lodash';
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

  constructor(
    private svc: CommandChannelService,
    private modalSvc: BsModalService,
    private domSanitizer: DomSanitizer,
  ) {
    this.listConfig = {
      useExpandItems: true
    };
  }

  set autoRefreshEnabled(enabled: boolean) {
    window.clearInterval(this.refresh);
    if (enabled) {
      this.refresh = window.setInterval(() => this.refreshList(), 10000);
    }
  }

  get autoRefreshEnabled(): boolean {
    return this.refresh != null;
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
            // url.port = '80';
            this.downloadBaseUrl = url.toString();
            this.reportsBaseUrl = this.downloadBaseUrl + 'reports';
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
            this.svc.sendMessage('url');
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('list')
        .subscribe(r => {
          const msg = (r as ResponseMessage<Recording[]>);
          if (msg.status === 0) {
            const newRecordings = (r as ResponseMessage<Recording[]>).payload.sort((a, b) => Math.min(a.startTime, b.startTime));
            if (!isEqual(this.recordings, newRecordings)) {
              this.recordings = newRecordings;
            }
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
            this.svc.sendMessage('url');
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

  setReportUrl(recordingName: string, frame: HTMLIFrameElement): void {
    frame.width = '100%';
    frame.height = '400';
    frame.style.border = '';
    const url = `${this.reportsBaseUrl}/${recordingName}`;
    const sanitized = this.domSanitizer.bypassSecurityTrustResourceUrl(url);
    frame.src = (sanitized as any).changingThisBreaksApplicationSecurity;
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
