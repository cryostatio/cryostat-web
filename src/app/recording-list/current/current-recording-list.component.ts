import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { NotificationService, NotificationType } from 'patternfly-ng/notification';
import { Subscription } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { ApiService, Recording } from 'src/app/api.service';
import { CommandChannelService, ResponseMessage } from '../../command-channel.service';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { CreateRecordingComponent } from '../../create-recording/create-recording.component';
import { UploadResponse } from '../recording-list.component';

export enum ConnectionState {
  UNKNOWN,
  CONNECTED,
  DISCONNECTED,
}

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
  private readonly reportExpansions = new Map<Recording, boolean>();
  private readonly reportUrls = new Map<string, string>();

  private readonly awaitingMsgIds = new Set<string>();

  constructor(
    private svc: CommandChannelService,
    private apiSvc: ApiService,
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
        .pipe(
          filter(m => this.awaitingMsgIds.has(m.id))
        )
        .subscribe(resp => {
          this.awaitingMsgIds.delete(resp.id);
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
      .pipe(
        filter(m => this.awaitingMsgIds.has(m.id))
      )
      .subscribe(resp => {
        this.awaitingMsgIds.delete(resp.id);
        if (resp.status === 0) {
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

  reportExpanded(recording: Recording): boolean {
    return this.reportExpansions.get(recording);
  }

  toggleReport(frame: HTMLIFrameElement, spinner: HTMLDivElement, recording: Recording): void {
    if (!this.reportExpansions.has(recording)) {
      this.reportExpansions.set(recording, false);
    }

    this.reportExpansions.set(recording, !this.reportExpansions.get(recording));
    if (this.reportExpansions.get(recording)) {
      this.apiSvc.getReport(recording).subscribe(report => {
        const blob = new Blob([ report ], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        if (this.reportUrls.has(recording.name)) {
          window.URL.revokeObjectURL(this.reportUrls.get(recording.name));
        }
        this.reportUrls.set(recording.name, url);
        frame.src = url;
        spinner.hidden = true;
        frame.hidden = false;
      });
    } else {
      window.URL.revokeObjectURL(this.reportUrls.get(recording.name));
      this.reportUrls.delete(recording.name);
      spinner.hidden = false;
      frame.hidden = true;
    }
  }

  save(name: string): void {
    this.awaitingMsgIds.add(
      this.svc.sendMessage('save', [ name ])
    );
  }

  download(recording: Recording): void {
    this.apiSvc.downloadRecording(recording);
  }

  delete(name: string): void {
    this.modalSvc.show(ConfirmationDialogComponent, {
      initialState: {
        destructive: true,
        title: 'Confirm Deletion',
        message: 'Are you sure you would like to delete this recording? ' +
        'Once deleted, recordings can not be retrieved and the data is lost.'
      }
    }).content.onAccept().subscribe(() => {
      this.svc.sendMessage('delete', [ name ]);
      window.URL.revokeObjectURL(this.reportUrls.get(name));
      this.reportUrls.delete(name);
    });
  }

  grafanaUpload(name: string): void {
    this.svc.grafanaDatasourceUrl().pipe(
      first()
    ).subscribe(grafana => {
      this.notifications.message(
        NotificationType.INFO, 'Upload started', null, false, null, null
      );
      this.awaitingMsgIds.add(
        this.svc.sendMessage('upload-recording', [ name, `${grafana}/load` ])
      );
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

}
