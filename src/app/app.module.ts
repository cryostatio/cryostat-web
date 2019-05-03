import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

// import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HelpButtonModule } from './help/help-button.module';
import { ConnectButtonModule } from './connect/connect-button.module';
import { DumpButtonModule } from './dump/dump-button.module';
import { ListButtonModule } from './list/list-button.module';
import { UrlButtonModule } from './url/url-button.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    // AppRoutingModule,
    HelpButtonModule,
    ConnectButtonModule,
    DumpButtonModule,
    ListButtonModule,
    UrlButtonModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
