import { Component, Input } from '@angular/core';
import { CommandChannelService } from 'src/app/command-channel.service';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-snapshot-recording',
  templateUrl: './snapshot-recording.component.html'
})
export class SnapshotRecordingComponent {

  @Input() modalRef: BsModalRef;

  constructor(
    private svc: CommandChannelService,
  ) { }

  submit(): void {
    this.svc.sendMessage('snapshot');
    this.modalRef.hide();
  }

}
