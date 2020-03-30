import { Component, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-create-recording-form',
  templateUrl: './create-recording.component.html',
  styleUrls: ['./create-recording.component.less']
})
export class CreateRecordingComponent {

  @Input() name: string = '';
  @Input() duration: number = -1;
  @Input() unitMultiplier: number = 1;
  @Input() events: string = '';
  @Input() recordingType: string = '';

  constructor(
    public modalRef: BsModalRef,
  ) { }
}
