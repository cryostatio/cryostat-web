import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CustomRecordingModule } from './custom-recording/custom-recording.module';
import { SnapshotRecordingModule } from './snapshot-recording/snapshot-recording.module';
import { CreateRecordingComponent } from './create-recording.component';

@NgModule({
  imports: [
    BrowserModule,
    TabsModule.forRoot(),
    CustomRecordingModule,
    SnapshotRecordingModule,
  ],
  declarations: [
    CreateRecordingComponent
  ],
  exports: [
    CreateRecordingComponent
  ]
})
export class CreateRecordingModule { }
