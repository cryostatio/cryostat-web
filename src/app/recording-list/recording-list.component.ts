import { Component } from '@angular/core';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent {

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
