import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { CreateRecordingComponent } from './create-recording.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    ModalModule.forRoot(),
  ],
  declarations: [
    CreateRecordingComponent
  ],
  exports: [
    CreateRecordingComponent
  ]
})
export class CreateRecordingModule { }
