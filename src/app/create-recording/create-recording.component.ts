import { Component } from '@angular/core';
import { CommandChannelService } from '../command-channel.service';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-create-recording-form',
  templateUrl: './create-recording.component.html'
})
export class CreateRecordingComponent {

  name = '';
  duration = -1;
  events = '';

  constructor(
    public modalRef: BsModalRef,
    public svc: CommandChannelService,
  ) { }

  submit(): void {
    if (this.name === '' || this.events === '') {
      return;
    }
    if (this.duration > 0) {
      this.svc.sendMessage('dump', [ this.name.trim(), String(this.duration), this.events ]);
    } else {
      this.svc.sendMessage('start', [ this.name.trim(), this.events ]);
    }
    this.name = '';
    this.duration = -1;
    this.events = '';
    this.modalRef.hide();
  }
}
