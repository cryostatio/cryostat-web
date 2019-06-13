import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CurrentRecordingListModule } from './current/current-recording-list.module';
import { RecordingListComponent } from './recording-list.component';
import { ArchivedRecordingListModule } from './archived/archived-recording-list.module';

@NgModule({
  imports: [
    BrowserModule,
    TabsModule.forRoot(),
    CurrentRecordingListModule,
    ArchivedRecordingListModule,
  ],
  exports: [
    RecordingListComponent,
  ],
  declarations: [
    RecordingListComponent,
  ],
})
export class RecordingListModule { }
