import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-recording-form',
  templateUrl: './create-recording.component.html'
})
export class CreateRecordingComponent implements OnInit, OnDestroy {
  name = '';
  duration = -1;
  events = '';
  connected = false;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('is-connected')
        .subscribe(r => this.connected = r.payload === 'true')
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => this.connected = false)
    );

    this.subscriptions.push(
      this.svc.onResponse('connect')
        .subscribe(() => this.connected = true)
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  submit(): void {
    if (this.duration > 0) {
      this.svc.sendMessage('dump', [ this.name.trim(), String(this.duration), this.events ]);
    } else {
      this.svc.sendMessage('start', [ this.name.trim(), this.events ]);
    }
    this.name = '';
    this.duration = -1;
    this.events = '';
  }
}
