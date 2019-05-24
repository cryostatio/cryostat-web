import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { CreateRecordingComponent } from './create-recording.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    TooltipModule.forRoot(),
  ],
  declarations: [
    CreateRecordingComponent
  ],
  exports: [
    CreateRecordingComponent
  ]
})
export class CreateRecordingModule { }
