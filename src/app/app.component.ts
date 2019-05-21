import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommandChannelService } from './command-channel.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  constructor(
    public svc: CommandChannelService,
  ) { }
}
