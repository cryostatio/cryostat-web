import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DumpButtonComponent } from './dump-button.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
  ],
  declarations: [
    DumpButtonComponent
  ],
  exports: [
    DumpButtonComponent
  ]
})
export class DumpButtonModule { }
