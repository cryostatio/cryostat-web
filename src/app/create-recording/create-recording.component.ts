import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-create-recording-form',
  templateUrl: './create-recording.component.html',
  styleUrls: ['./create-recording.component.less']
})
export class CreateRecordingComponent {
  constructor(
    public modalRef: BsModalRef,
  ) { }
}
