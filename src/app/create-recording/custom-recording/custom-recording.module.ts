import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { CustomRecordingComponent } from './custom-recording.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    TooltipModule.forRoot(),
  ],
  exports: [
    CustomRecordingComponent,
  ],
  declarations: [
    CustomRecordingComponent,
  ]
})
export class CustomRecordingModule { }
