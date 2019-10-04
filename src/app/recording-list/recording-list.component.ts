import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { CommandChannelService } from '../command-channel.service';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent {

  archiveEnabled = this.svc.isArchiveEnabled();
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private svc: CommandChannelService,
  ) {}

}

export interface SavedRecording {
  name: string;
  downloadUrl: string;
  reportUrl: string;
}

export interface UploadResponse {
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
