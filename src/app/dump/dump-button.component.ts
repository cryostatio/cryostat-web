import { Component } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';

@Component({
  selector: 'app-dump-button',
  templateUrl: './dump-button.component.html'
})
export class DumpButtonComponent {
  name = '';
  duration = -1;
  events = '';

  constructor(
    public svc: CommandChannelService,
  ) { }

  dump(): void {
    if (this.duration > 0) {
      this.svc.sendMessage('dump', [ this.name.trim(), String(this.duration), this.events ]);
    } else {
      this.svc.sendMessage('start', [ this.name.trim(), this.events ]);
    }
    this.name = '';
    this.duration = 30;
    this.events = '';
  }
}
