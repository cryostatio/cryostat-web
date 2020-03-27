import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { TableModule } from 'patternfly-ng/table';
import { EventTemplatesComponent } from './event-templates.component';

@NgModule({
  imports: [
    BrowserModule,
    TableModule,
  ],
  declarations: [
    EventTemplatesComponent,
  ],
  exports: [
    EventTemplatesComponent,
  ]
})
export class EventTemplatesModule { }
