import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

// import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ClientConnectModule } from './client-connect/client-connect.module';
import { ConnectButtonModule } from './connect/connect-button.module';
import { DumpButtonModule } from './dump/dump-button.module';
import { RecordingListModule } from './recording-list/recording-list.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    // AppRoutingModule,
    ClientConnectModule,
    ConnectButtonModule,
    DumpButtonModule,
    RecordingListModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
