import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectButtonComponent } from './connect-button.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
  ],
  declarations: [
    ConnectButtonComponent
  ],
  exports: [
    ConnectButtonComponent
  ]
})
export class ConnectButtonModule { }
