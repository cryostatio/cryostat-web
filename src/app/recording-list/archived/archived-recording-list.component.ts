import { Component, OnInit, OnDestroy } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { Subscription } from 'rxjs';
import { CommandChannelService, ResponseMessage } from 'src/app/command-channel.service';
import { ConfirmationDialogComponent } from 'src/app/confirmation-dialog/confirmation-dialog.component';
import { first } from 'rxjs/operators';
import { NotificationService, NotificationType } from 'patternfly-ng/notification';
import { HttpClient } from '@angular/common/http';
import { UploadResponse } from '../recording-list.component';
import { SavedRecording, ApiService } from 'src/app/api.service';

@Component({
  selector: 'app-archived-recording-list',
  templateUrl: './archived-recording-list.component.html'
})
export class ArchivedRecordingListComponent implements OnInit, OnDestroy {

  recordings: SavedRecording[] = [];
  listConfig: ListConfig;
  grafanaEnabled = false;

  private readonly subscriptions: Subscription[] = [];

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

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('list-saved')
        .subscribe(r => {
          if (r.status === 0) {
            this.recordings = r.payload;
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('delete-saved')
        .subscribe(r => {
          if (r.status === 0) {
            this.refreshList();
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('save')
        .subscribe(r => {
          if (r.status === 0) {
            this.refreshList();
          }
        })
    );

    this.subscriptions.push(
      this.svc.grafanaDatasourceUrl().pipe(
        first()
      ).subscribe(() => this.grafanaEnabled = true)
    );

    this.refreshList();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  refreshList(): void {
    this.svc.sendMessage('list-saved');
  }

  download(recording: SavedRecording): void {
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
    }).content.onAccept().subscribe(() => this.svc.sendMessage('delete-saved', [ name ]));
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

  reportLoaded(spinner: HTMLDivElement, frame: HTMLIFrameElement): void {
    spinner.hidden = true;
    frame.hidden = false;
  }

}
