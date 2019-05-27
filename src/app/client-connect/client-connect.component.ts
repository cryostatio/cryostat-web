import { Component } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-client-connect',
  templateUrl: './client-connect.component.html'
})
export class ClientConnectComponent {
  clientUrl = '';

  constructor(
    public svc: CommandChannelService,
  ) {
    svc.clientUrl().pipe(
      first()
    ).subscribe(url => this.clientUrl = url);
  }

  connect(): void {
    this.svc.connect(this.clientUrl);
  }
}
