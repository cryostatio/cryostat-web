import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ListModule } from 'patternfly-ng/list';
import { ModalModule } from 'ngx-bootstrap/modal';
import { CreateRecordingModule } from '../create-recording/create-recording.module';
import { RecordingListComponent } from './recording-list.component';
import { CreateRecordingComponent } from '../create-recording/create-recording.component';

@NgModule({
  imports: [
    BrowserModule,
    ListModule,
    ModalModule.forRoot(),
    CreateRecordingModule,
  ],
  declarations: [
    RecordingListComponent,
  ],
  exports: [
    RecordingListComponent,
  ],
  bootstrap: [
    CreateRecordingComponent,
  ]
})
export class RecordingListModule { }
