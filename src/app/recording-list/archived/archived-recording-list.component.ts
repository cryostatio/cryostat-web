import { Component, OnInit, OnDestroy } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { Subscription, combineLatest } from 'rxjs';
import { CommandChannelService, ResponseMessage } from 'src/app/command-channel.service';
import { ConfirmationDialogComponent } from 'src/app/confirmation-dialog/confirmation-dialog.component';
import { first } from 'rxjs/operators';
import { NotificationService, NotificationType } from 'patternfly-ng/notification';

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
    private modalSvc: BsModalService,
    private notifications: NotificationService,
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
            const newRecordings = r.payload;

            newRecordings.forEach(nr => {
              // Ports reported by container-jfr will be the ports that it binds
              // within its container, but we'll override that to port 80 for
              // OpenShift/Minishift demo deployments
              const downloadUrl: URL = new URL(nr.downloadUrl);
              downloadUrl.port = '80';
              nr.downloadUrl = downloadUrl.toString();
            });

            this.recordings = newRecordings;
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
      this.svc.grafanaUrl().pipe(
        first()
      ).subscribe(() => this.grafanaEnabled = true)
    );

    this.subscriptions.push(
      this.svc.onResponse('upload-saved')
        .subscribe((r: ResponseMessage<UploadResponse>) => {
          if (r.status === 0) {
            // TODO open Grafana dashboard in new window/tab
            this.notifications.message(
              NotificationType.SUCCESS, 'Upload success', null, false, null, null
            );
          } else {
            this.notifications.message(
              NotificationType.WARNING, 'Upload failed', JSON.stringify(r), false, null, null
            );
          }
        })
    );

    this.refreshList();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  refreshList(): void {
    this.svc.sendMessage('list-saved');
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
    this.svc.grafanaUrl().pipe(
      first()
    ).subscribe(grafana => {
      this.notifications.message(
        NotificationType.INFO, 'Upload started', null, false, null, null
      );
      this.svc.sendMessage('upload-saved', [ name, `${grafana}/load` ]);
    });
  }

}

interface SavedRecording {
  name: string;
  downloadUrl: string;
}

interface UploadResponse {
  body: string;
  status: {
    reasonphrase: string;
    statusCode: number;
    protoVersion: {
      protocol: string;
      major: number;
      minor: number;
    }
  };
}
