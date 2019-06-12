import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ListModule } from 'patternfly-ng/list';
import { ModalModule } from 'ngx-bootstrap/modal';
import { CreateRecordingModule } from '../../create-recording/create-recording.module';
import { ConfirmationDialogModule } from '../../confirmation-dialog/confirmation-dialog.module';
import { CurrentRecordingListComponent } from './current-recording-list.component';
import { CreateRecordingComponent } from '../../create-recording/create-recording.component';
import { SharedModule } from 'src/app/shared/shared-module';

@NgModule({
  imports: [
    BrowserModule,
    ListModule,
    FormsModule,
    ModalModule.forRoot(),
    SharedModule,
    CreateRecordingModule,
    ConfirmationDialogModule,
  ],
  declarations: [
    CurrentRecordingListComponent,
  ],
  exports: [
    CurrentRecordingListComponent,
  ],
  bootstrap: [
    CreateRecordingComponent,
  ]
})
export class CurrentRecordingListModule { }
