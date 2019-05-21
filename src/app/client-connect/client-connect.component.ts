import { Component } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';

@Component({
  selector: 'app-client-connect',
  templateUrl: './client-connect.component.html'
})
export class ClientConnectComponent {
  clientUrl = '';

  constructor(
    public svc: CommandChannelService,
  ) { }

  connect(): void {
    this.svc.connect(this.clientUrl);
  }
}
