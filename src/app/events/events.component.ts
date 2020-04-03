import { Component } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
})
export class EventsComponent {
  constructor(public svc: CommandChannelService) { }
}
