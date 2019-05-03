import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UrlButtonComponent } from './url-button.component';

@NgModule({
  imports: [
    FormsModule,
  ],
  declarations: [
    UrlButtonComponent
  ],
  exports: [
    UrlButtonComponent
  ]
})
export class UrlButtonModule { }
