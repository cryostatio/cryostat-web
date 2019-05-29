import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-create-recording-form',
  templateUrl: './create-recording.component.html'
})
export class CreateRecordingComponent {
  constructor(
    public modalRef: BsModalRef,
  ) { }
}
