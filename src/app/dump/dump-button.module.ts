import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { DumpButtonComponent } from './dump-button.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    ModalModule.forRoot(),
  ],
  declarations: [
    DumpButtonComponent
  ],
  exports: [
    DumpButtonComponent
  ]
})
export class DumpButtonModule { }
