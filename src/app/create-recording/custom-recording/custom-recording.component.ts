import { Component, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { CommandChannelService } from 'src/app/command-channel.service';

@Component({
  selector: 'app-custom-recording',
  templateUrl: './custom-recording.component.html'
})
export class CustomRecordingComponent {

  @Input() modalRef: BsModalRef;

  name = '';
  duration = 0;
  unitMultiplier = 1;
  events = '';

  constructor(
    public svc: CommandChannelService,
  ) { }

  submit(): void {
    if (this.name === '' || this.events === '') {
      return;
    }
    if (this.duration > 0) {
      this.svc.sendMessage('dump', [ this.name.trim(), String(Math.round(this.duration * this.unitMultiplier)), this.events ]);
    } else {
      this.svc.sendMessage('start', [ this.name.trim(), this.events ]);
    }
    this.name = '';
    this.duration = 0;
    this.events = '';
    this.modalRef.hide();
  }
}
