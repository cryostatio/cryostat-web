import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DumpButtonComponent } from './dump-button.component';

@NgModule({
  imports: [
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
