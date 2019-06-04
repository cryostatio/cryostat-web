import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@NgModule({
  imports: [
    BrowserModule,
    ModalModule.forRoot(),
  ],
  exports: [
    ConfirmationDialogComponent,
  ],
  declarations: [
    ConfirmationDialogComponent,
  ],
  entryComponents: [
    ConfirmationDialogComponent,
  ]
})
export class ConfirmationDialogModule { }
