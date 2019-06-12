import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CurrentRecordingListModule } from './current/current-recording-list.module';
import { RecordingListComponent } from './recording-list.component';

@NgModule({
  imports: [
    BrowserModule,
    CurrentRecordingListModule,
  ],
  exports: [
    RecordingListComponent,
  ],
  declarations: [
    RecordingListComponent,
  ],
})
export class RecordingListModule { }
