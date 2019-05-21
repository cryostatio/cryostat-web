import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.less']
})
export class RecordingListComponent {
  @Input() recordings: Recording[];
  @Input() downloadBaseUrl: string;
  @Output() delete = new EventEmitter<string>();
  @Output() stop = new EventEmitter<string>();

  onDelete(name: string): void {
    this.delete.emit(name);
  }

  onStop(name: string): void {
    this.stop.emit(name);
  }
}

export interface Recording {
  id: number;
  name: string;
  state: string;
  duration: number;
  startTime: Date;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}
