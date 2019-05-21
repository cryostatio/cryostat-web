import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommandChannelService, StringMessage } from '../command-channel.service';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent implements OnInit {
  @Input() recordings: Recording[];
  @Output() delete = new EventEmitter<string>();
  @Output() stop = new EventEmitter<string>();

  downloadBaseUrl: string;

  constructor(
    private svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.svc.onResponse('url')
      .subscribe(r => {
        const url: URL = new URL((r as StringMessage).payload);
        url.protocol = 'http:';
        // Port reported by container-jmx-client will be the port that it binds
        // within its container, but we'll override that to port 80 for
        // OpenShift/Minishift demo deployments
        url.port = '80';
        this.downloadBaseUrl = url.toString();
      });
    this.svc.sendMessage('url');
  }

  onDelete(name: string): void {
    this.delete.emit(name);
  }

  onStop(name: string): void {
    this.stop.emit(name);
  }
}

export interface Recording {
  id: number;
  name: string;
  state: string;
  duration: number;
  startTime: Date;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}
