import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ListModule } from 'patternfly-ng/list';
import { RecordingListComponent } from './recording-list.component';

@NgModule({
  imports: [
    BrowserModule,
    ListModule,
  ],
  declarations: [
    RecordingListComponent,
  ],
  exports: [
    RecordingListComponent,
  ]
})
export class RecordingListModule { }
