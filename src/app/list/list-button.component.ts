import { Component, EventEmitter, Output } from '@angular/core';
import { CommandMessage } from 'src/app/app.component';

@Component({
  selector: 'app-list-button',
  templateUrl: './list-button.component.html'
})
export class ListButtonComponent {
  @Output() fired = new EventEmitter<CommandMessage>();

  fire(): void {
    this.fired.emit({ command: 'list', args: [] });
  }
}
