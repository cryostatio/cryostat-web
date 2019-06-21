import { Component, OnInit } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ListConfig } from 'patternfly-ng/list';
import { Subscription, combineLatest } from 'rxjs';
import { CommandChannelService, ResponseMessage } from 'src/app/command-channel.service';
import { ConfirmationDialogComponent } from 'src/app/confirmation-dialog/confirmation-dialog.component';
import { first } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-archived-recording-list',
  templateUrl: './archived-recording-list.component.html'
})
export class ArchivedRecordingListComponent implements OnInit {

  recordings: SavedRecording[] = [];
  listConfig: ListConfig;
  grafanaEnabled = false;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    private svc: CommandChannelService,
    private http: HttpClient,
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
      combineLatest(this.svc.uploadUrl(), this.svc.loadUrl()).pipe(
        first()
      ).subscribe(() => this.grafanaEnabled = true)
    );

    this.subscriptions.push(
      combineLatest(this.svc.onResponse('upload-saved'), this.svc.loadUrl())
        .subscribe((r: [ResponseMessage<UploadResponse>, string]) => {
          if (r[0].status === 0) {
            const message = /Uploaded: file-uploads\/(\S+)/.exec(r[0].payload.body)[1];
            this.http.post(r[1], message, { responseType: 'text' }).subscribe(() => {});
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

  grafanaUpload(name: string): void {
    this.svc.uploadUrl().pipe(
      first()
    ).subscribe(uploadUrl => this.svc.sendMessage('upload-saved', [ name, uploadUrl ]));
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
