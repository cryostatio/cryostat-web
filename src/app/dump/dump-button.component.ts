import { Component, EventEmitter, Output } from '@angular/core';
import { CommandMessage } from 'src/app/app.component';

@Component({
  selector: 'app-dump-button',
  templateUrl: './dump-button.component.html'
})
export class DumpButtonComponent {
  @Output() fired = new EventEmitter<CommandMessage>();
  name = '';
  length = 0;
  events = '';

  fire(): void {
    this.fired.emit({ command: 'dump', args: [ this.name, String(this.length), this.events ] });
  }
}
