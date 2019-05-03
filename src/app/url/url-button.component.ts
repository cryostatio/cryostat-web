import { Component, EventEmitter, Output } from '@angular/core';
import { CommandMessage } from 'src/app/app.component';

@Component({
  selector: 'app-url-button',
  templateUrl: './url-button.component.html'
})
export class UrlButtonComponent {
  @Output() fired = new EventEmitter<CommandMessage>();

  fire(): void {
    this.fired.emit({ command: 'url', args: [] });
  }
}
