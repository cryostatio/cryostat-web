import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AuthDialogComponent } from './auth-dialog.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    ModalModule.forRoot(),
  ],
  exports: [
    AuthDialogComponent,
  ],
  declarations: [
    AuthDialogComponent,
  ],
  entryComponents: [
    AuthDialogComponent,
  ]
})
export class AuthDialogModule { }
