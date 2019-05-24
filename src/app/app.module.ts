import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { NotificationService, ToastNotificationModule, ToastNotificationListModule } from 'patternfly-ng/notification';

// import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ClientConnectModule } from './client-connect/client-connect.module';
import { ConnectButtonModule } from './connect/connect-button.module';
import { CreateRecordingModule } from './create-recording/create-recording.module';
import { RecordingListModule } from './recording-list/recording-list.module';
import { CommandChannelService } from './command-channel.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ToastNotificationModule,
    ToastNotificationListModule,
    // AppRoutingModule,
    ClientConnectModule,
    ConnectButtonModule,
    CreateRecordingModule,
    RecordingListModule,
  ],
  providers: [
    CommandChannelService,
    NotificationService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
