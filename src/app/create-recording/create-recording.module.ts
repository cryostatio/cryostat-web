import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CustomRecordingModule } from './custom-recording/custom-recording.module';
import { CreateRecordingComponent } from './create-recording.component';

@NgModule({
  imports: [
    BrowserModule,
    TabsModule.forRoot(),
    CustomRecordingModule,
  ],
  declarations: [
    CreateRecordingComponent
  ],
  exports: [
    CreateRecordingComponent
  ]
})
export class CreateRecordingModule { }
