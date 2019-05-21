import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommandChannelService, StringMessage } from '../command-channel.service';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent implements OnInit, OnDestroy {
  @Input() recordings: Recording[];
  @Output() delete = new EventEmitter<string>();
  @Output() stop = new EventEmitter<string>();

  downloadBaseUrl: string;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    private svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('url')
        .subscribe(r => {
          const url: URL = new URL((r as StringMessage).payload);
          url.protocol = 'http:';
          // Port reported by container-jmx-client will be the port that it binds
          // within its container, but we'll override that to port 80 for
          // OpenShift/Minishift demo deployments
          url.port = '80';
          this.downloadBaseUrl = url.toString();
        })
    );
    this.svc.sendMessage('url');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
