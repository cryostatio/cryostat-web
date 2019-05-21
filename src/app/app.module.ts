import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

// import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ClientConnectModule } from './client-connect/client-connect.module';
import { ConnectButtonModule } from './connect/connect-button.module';
import { DumpButtonModule } from './dump/dump-button.module';
import { RecordingListModule } from './recording-list/recording-list.module';
import { CommandChannelService } from './command-channel.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    // AppRoutingModule,
    ClientConnectModule,
    ConnectButtonModule,
    DumpButtonModule,
    RecordingListModule,
  ],
  providers: [
    CommandChannelService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
