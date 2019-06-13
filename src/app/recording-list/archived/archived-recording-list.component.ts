import { Component, OnInit } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { Subscription } from 'rxjs';
import { CommandChannelService } from 'src/app/command-channel.service';
import { ConfirmationDialogComponent } from 'src/app/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-archived-recording-list',
  templateUrl: './archived-recording-list.component.html'
})
export class ArchivedRecordingListComponent implements OnInit {

  recordings: SavedRecording[] = [];
  listConfig: ListConfig;

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
      this.svc.onResponse('list-saved')
        .subscribe(r => {
          if (r.status === 0) {
            const newRecordings = r.payload;

            newRecordings.forEach(nr => {
              // Ports reported by container-jmx-client will be the ports that it binds
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

    this.refreshList();
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

}

interface SavedRecording {
  name: string;
  downloadUrl: string;
}
