import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RecordingListComponent } from './recording-list.component';

@NgModule({
  imports: [
    BrowserModule,
  ],
  declarations: [
    RecordingListComponent,
  ],
  exports: [
    RecordingListComponent,
  ]
})
export class RecordingListModule { }
