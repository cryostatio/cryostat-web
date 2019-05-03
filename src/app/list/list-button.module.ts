import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ListButtonComponent } from './list-button.component';

@NgModule({
  imports: [
    FormsModule,
  ],
  declarations: [
    ListButtonComponent
  ],
  exports: [
    ListButtonComponent
  ]
})
export class ListButtonModule { }
