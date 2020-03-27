import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { EventTypesModule } from './event-types/event-types.module';
import { EventTemplatesModule } from './event-templates/event-templates.module';
import { EventsComponent } from './events.component';

@NgModule({
  imports: [
    BrowserModule,
    TabsModule.forRoot(),
    EventTypesModule,
    EventTemplatesModule,
  ],
  declarations: [
    EventsComponent,
  ],
  exports: [
    EventsComponent,
  ]
})
export class EventsModule { }
