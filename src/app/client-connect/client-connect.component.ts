import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-client-connect',
  templateUrl: './client-connect.component.html'
})
export class ClientConnectComponent {
  @Output() clientSelected = new EventEmitter<string>();
  @Input() connected = false;
  clientUrl = '';

  fire(): void {
    this.clientSelected.emit(this.clientUrl);
    this.clientUrl = '';
  }
}
