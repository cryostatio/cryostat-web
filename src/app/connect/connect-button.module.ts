import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ConnectButtonComponent } from './connect-button.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    BsDropdownModule.forRoot()
  ],
  declarations: [
    ConnectButtonComponent
  ],
  exports: [
    ConnectButtonComponent
  ]
})
export class ConnectButtonModule { }
