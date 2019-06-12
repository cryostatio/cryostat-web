import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SafeUrlPipe } from './safe-url.pipe';

@NgModule({
  imports: [
    BrowserModule,
  ],
  exports: [
    SafeUrlPipe,
  ],
  declarations: [
    SafeUrlPipe,
  ]
})
export class SharedModule { }
