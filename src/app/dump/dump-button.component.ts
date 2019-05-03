import { Component, EventEmitter, Output } from '@angular/core';
import { CommandMessage } from 'src/app/app.component';

@Component({
  selector: 'app-dump-button',
  templateUrl: './dump-button.component.html'
})
export class DumpButtonComponent {
  @Output() fired = new EventEmitter<CommandMessage>();
  name = '';
  duration = 30;
  events = '';

  fire(): void {
    this.fired.emit({ command: 'dump', args: [ this.name, String(this.duration), this.events ] });
    this.name = '';
    this.duration = 30;
    this.events = '';
  }
}
