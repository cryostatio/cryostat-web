import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ElementRef } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { NotificationService, NotificationType } from 'patternfly-ng/notification';
import { Subscription } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { CommandChannelService, ResponseMessage } from '../../command-channel.service';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { CreateRecordingComponent } from '../../create-recording/create-recording.component';
import { UploadResponse } from '../recording-list.component';

@Component({
  selector: 'app-current-recording-list',
  templateUrl: './current-recording-list.component.html',
  styleUrls: ['./current-recording-list.component.less']
})
export class CurrentRecordingListComponent implements OnInit, OnDestroy {

  State = ConnectionState;
  connected: ConnectionState = ConnectionState.UNKNOWN;
  recordings: Recording[] = [];
  listConfig: ListConfig;
  grafanaEnabled = false;

  private refresh: number;
  private readonly subscriptions: Subscription[] = [];
  private readonly refreshInterval: number = 30 * 1000;

  constructor(
    private svc: CommandChannelService,
    private modalSvc: BsModalService,
    private notifications: NotificationService,
    private http: HttpClient,
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
        .subscribe(resp => {
          if (resp.status === 0) {
            this.connected = ConnectionState.CONNECTED;
          } else {
            this.connected = ConnectionState.UNKNOWN;
          }
        })
    );

    this.subscriptions.push(
      this.svc.grafanaDatasourceUrl().pipe(
        first()
      ).subscribe(() => this.grafanaEnabled = true)
    );

    this.subscriptions.push(
      this.svc.onResponse('save')
        .subscribe(resp => {
          if (resp.status === 0) {
            this.notifications.message(
              NotificationType.SUCCESS, 'Recording saved as ' + resp.payload, null, false, null, null
            );
          } else {
            this.notifications.message(
              NotificationType.WARNING, resp.payload, null, false, null, null
            );
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('upload-recording')
        .subscribe((r: ResponseMessage<UploadResponse>) => {
          if (r.status === 0) {
            this.notifications.message(
              NotificationType.SUCCESS, 'Upload success', null, false, null, null
            );
            this.http.get('/grafana_dashboard_url')
              .subscribe((url: { grafanaDashboardUrl: string }) => window.open(url.grafanaDashboardUrl, '_blank'));
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

  uploadRecording(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jfr';
    input.onchange = () => {
      if (!input.files[0]) {
        return;
      }

      const payload = new FormData(); // as multipart/form-data
      payload.append('recording', input.files[0]);

      this.http.post(
        '/recordings',
        payload).subscribe(
        () => this.notifications.message(NotificationType.INFO, 'Upload started', null, false, null, null),
        (err: Error) => this.notifications.message(NotificationType.WARNING, 'Upload failed', err.message, false, null, null),
        () => this.notifications.message(NotificationType.INFO, 'Upload completed', null, false, null, null)
      );
    };
    input.click();
  }

  save(name: string): void {
    this.svc.sendMessage('save', [ name ]);
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

  grafanaUpload(name: string): void {
    this.svc.grafanaDatasourceUrl().pipe(
      first()
    ).subscribe(grafana => {
      this.notifications.message(
        NotificationType.INFO, 'Upload started', null, false, null, null
      );
      this.svc.sendMessage('upload-recording', [ name, `${grafana}/load` ]);
    });
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

  reportLoaded(spinner: HTMLDivElement, frame: HTMLIFrameElement): void {
    spinner.hidden = true;
    frame.hidden = false;
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

export enum ConnectionState {
  UNKNOWN,
  CONNECTED,
  DISCONNECTED,
}
