import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { filter, first } from 'rxjs/operators';
import { CommandChannelService } from '../command-channel.service';

@Component({
  selector: 'app-event-types',
  templateUrl: './event-types.component.html',
  styleUrls: ['./event-types.component.less']
})
export class EventTypesComponent implements OnInit {

  @ViewChild('nameTemplate') nameTemplate: TemplateRef<any>;
  @ViewChild('typeIdTemplate') typeIdTemplate: TemplateRef<any>;
  @ViewChild('descriptionTemplate') descriptionTemplate: TemplateRef<any>;
  @ViewChild('categoryTemplate') categoryTemplate: TemplateRef<any>;
  @ViewChild('optionsTemplate') optionsTemplate: TemplateRef<any>;

  events: JfrEventType[];
  columns: any[];

  constructor(
    private svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.columns = [
      {
        cellTemplate: this.nameTemplate,
        draggable: true,
        prop: 'name',
        name: 'Name',
        resizeable: true
      }, {
        cellTemplate: this.typeIdTemplate,
        draggable: true,
        prop: 'typeId',
        name: 'ID',
        resizeable: true
      }, {
        cellTemplate: this.descriptionTemplate,
        draggable: true,
        prop: 'description',
        name: 'Description',
        resizeable: true
      }, {
        cellTemplate: this.categoryTemplate,
        draggable: true,
        prop: 'category',
        name: 'Categories',
        resizeable: true
      },
      {
        cellTemplate: this.optionsTemplate,
        draggable: true,
        prop: 'options',
        name: 'Options',
        resizeable: true
      }
    ];

    this.svc.onResponse('list-event-types')
      .subscribe(resp => {
        if (resp.status === 0) {
          this.events = resp.payload;
        }
      });

    this.svc.onResponse('is-connected').pipe(
      filter(r => r.status === 0),
      filter(r => r.payload === 'true'),
      first()
    ).subscribe(() => this.svc.sendMessage('list-event-types'));
  }

  getOptions(row: object): OptionDescriptor[] {
    const ret = [];
    Object.keys(row).forEach(k => ret.push(row[k]));
    return ret;
  }

}

interface JfrEventType {
  name: string;
  typeId: string;
  description: string;
  category: string[];
  options: Map<string, OptionDescriptor>;
}

interface OptionDescriptor {
  name: string;
  description: string;
  defaultValue: string;
}
