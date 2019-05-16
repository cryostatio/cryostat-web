import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientConnectComponent } from './client-connect.component';

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
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
