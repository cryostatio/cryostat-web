import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { FilterConfig, FilterType, FilterEvent } from 'patternfly-ng/filter';
import { ToolbarConfig } from 'patternfly-ng/toolbar/toolbar-config';
import { filter, first } from 'rxjs/operators';
import { CommandChannelService } from '../../command-channel.service';
import { TableConfig } from 'patternfly-ng/table';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-event-types',
  templateUrl: './event-types.component.html',
  styleUrls: ['./event-types.component.less']
})
export class EventTypesComponent implements OnInit, OnDestroy {

  @ViewChild('nameTemplate') nameTemplate: TemplateRef<any>;
  @ViewChild('typeIdTemplate') typeIdTemplate: TemplateRef<any>;
  @ViewChild('descriptionTemplate') descriptionTemplate: TemplateRef<any>;
  @ViewChild('categoryTemplate') categoryTemplate: TemplateRef<any>;
  @ViewChild('optionsTemplate') optionsTemplate: TemplateRef<any>;

  collapsed = true;
  filteredEvents: JfrEventType[];
  events: JfrEventType[];
  columns: any[];
  config: TableConfig;
  toolbarConfig: ToolbarConfig;
  private readonly subscriptions: Subscription[] = [];
  private filterConfig: FilterConfig;

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

    this.filterConfig = {
      fields: [
        {
          id: 'searchTerm',
          title: 'Search Term',
          placeholder: 'Filter by search term...',
          type: FilterType.TEXT
        }
      ],
      appliedFilters: [],
      resultsCount: 0,
      totalCount: 0
    };

    this.toolbarConfig = {
      filterConfig: this.filterConfig
    } as ToolbarConfig;

    this.config = {
      dragEnabled: true,
      showCheckbox: false,
      toolbarConfig: this.toolbarConfig,
      useExpandRows: false
    };

    this.subscriptions.push(
      this.svc.onResponse('list-event-types')
        .subscribe(resp => {
          if (resp.status === 0) {
            this.events = resp.payload;
            this.filteredEvents = [...this.events];
            this.filterConfig.resultsCount = this.events.length;
            this.filterConfig.totalCount = this.events.length;
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('is-connected').pipe(
        filter(r => r.status === 0),
        filter(r => r.payload !== 'false'),
        first()
      ).subscribe(() => this.svc.sendMessage('list-event-types'))
    );

    this.subscriptions.push(
      this.svc.onResponse('connect').pipe(
        filter(r => r.status === 0)
      ).subscribe(() => this.svc.sendMessage('list-event-types'))
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => {
          this.events = [];
          this.filteredEvents = this.events;
          this.filterConfig.resultsCount = 0;
          this.filterConfig.totalCount = 0;
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getOptions(row: object): OptionDescriptor[] {
    const ret = [];
    Object.keys(row).forEach(k => ret.push(row[k]));
    return ret;
  }

  onFilterChange(event: FilterEvent): void {
    if (event.appliedFilters.length === 0) {
      this.filteredEvents = [...this.events];
      this.filterConfig.resultsCount = this.filterConfig.totalCount;
      return;
    }
    const searchTerms = event.appliedFilters.map(f => f.value);
    this.filteredEvents = this.events.filter(e => eventMatchesSearchTerms(e, searchTerms));
    this.filterConfig.resultsCount = this.filteredEvents.length;
  }
}

function eventMatchesSearchTerms(event: JfrEventType, searchTerms: string[]): boolean {
  return searchTerms.some(term => eventMatchesSearchTerm(event, term));
}

function eventMatchesSearchTerm(event: JfrEventType, searchTerm: string): boolean {
  if (!!event.name && event.name.toLowerCase().includes(searchTerm)) {
    return true;
  }
  if (!!event.typeId && event.typeId.toLowerCase().includes(searchTerm)) {
    return true;
  }
  if (!!event.description && event.description.toLowerCase().includes(searchTerm)) {
    return true;
  }
  if (!!event.category && event.category.map(e => e.toLowerCase()).some(e => e.includes(searchTerm))) {
    return true;
  }

  return false;
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
