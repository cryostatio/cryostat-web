import { Component, EventEmitter, Output } from '@angular/core';
import { CommandMessage } from '../command-channel.service';

@Component({
  selector: 'app-dump-button',
  templateUrl: './dump-button.component.html'
})
export class DumpButtonComponent {
  @Output() fired = new EventEmitter<CommandMessage>();
  name = '';
  duration = -1;
  events = '';

  fire(): void {
    if (this.duration > 0) {
      this.fired.emit({ command: 'dump', args: [ this.name, String(this.duration), this.events ] });
    } else {
      this.fired.emit({ command: 'start', args: [ this.name, this.events ] });
    }
    this.name = '';
    this.duration = 30;
    this.events = '';
  }
}
