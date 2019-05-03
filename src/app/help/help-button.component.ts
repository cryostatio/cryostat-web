import { Component, EventEmitter, Output } from '@angular/core';
import { CommandMessage } from 'src/app/app.component';

@Component({
  selector: 'app-help-button',
  templateUrl: './help-button.component.html'
})
export class HelpButtonComponent {
  @Output() fired = new EventEmitter<CommandMessage>();

  fire(): void {
    this.fired.emit({ command: 'help', args: [] });
  }
}
