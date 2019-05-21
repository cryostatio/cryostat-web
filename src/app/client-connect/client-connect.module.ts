import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientConnectComponent } from './client-connect.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
  ],
  declarations: [
    ClientConnectComponent
  ],
  exports: [
    ClientConnectComponent
  ]
})
export class ClientConnectModule { }
