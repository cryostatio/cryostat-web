import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';

@Component({
  selector: 'app-client-connect',
  templateUrl: './client-connect.component.html'
})
export class ClientConnectComponent {
  @Output() clientSelected = new EventEmitter<string>();
  @Input() connected = false;
  clientUrl = '';

  constructor(
    public svc: CommandChannelService,
  ) { }

  fire(): void {
  }
}
