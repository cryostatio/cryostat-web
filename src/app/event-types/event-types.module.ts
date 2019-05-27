import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TableModule } from 'patternfly-ng/table';
import { EventTypesComponent } from './event-types.component';

@NgModule({
  imports: [
    BrowserModule,
    TableModule,
  ],
  declarations: [
    EventTypesComponent,
  ],
  exports: [
    EventTypesComponent,
  ]
})
export class EventTypesModule { }
