import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { FilterConfig, FilterType, FilterEvent } from 'patternfly-ng/filter';
import { ToolbarConfig } from 'patternfly-ng/toolbar/toolbar-config';
import { filter, first } from 'rxjs/operators';
import { CommandChannelService } from '../../command-channel.service';
import { TableConfig } from 'patternfly-ng/table';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-event-templates',
  templateUrl: './event-templates.component.html',
  styleUrls: ['./event-templates.component.less']
})
export class EventTemplatesComponent implements OnInit, OnDestroy {

  @ViewChild('nameTemplate') nameTemplate: TemplateRef<any>;
  @ViewChild('descriptionTemplate') descriptionTemplate: TemplateRef<any>;
  @ViewChild('providerTemplate') providerTemplate: TemplateRef<any>;

  collapsed = true;
  filteredTemplates: Template[];
  templates: Template[];
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
        cellTemplate: this.descriptionTemplate,
        draggable: true,
        prop: 'description',
        name: 'Description',
        resizeable: true
      }, {
        cellTemplate: this.providerTemplate,
        draggable: true,
        prop: 'provider',
        name: 'Provider',
        resizeable: true
      },
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
      this.svc.onResponse('list-event-templates')
        .subscribe(resp => {
          if (resp.status === 0) {
            this.templates = resp.payload;
            this.filteredTemplates = [...this.templates];
            this.filterConfig.resultsCount = this.templates.length;
            this.filterConfig.totalCount = this.templates.length;
          }
        })
    );

    this.subscriptions.push(
      this.svc.onResponse('is-connected').pipe(
        filter(r => r.status === 0),
        filter(r => r.payload !== 'false'),
        first()
      ).subscribe(() => this.svc.sendMessage('list-event-templates'))
    );

    this.subscriptions.push(
      this.svc.onResponse('connect').pipe(
        filter(r => r.status === 0)
      ).subscribe(() => this.svc.sendMessage('list-event-templates'))
    );

    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => {
          this.templates = [];
          this.filteredTemplates = this.templates;
          this.filterConfig.resultsCount = 0;
          this.filterConfig.totalCount = 0;
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onFilterChange(event: FilterEvent): void {
    if (event.appliedFilters.length === 0) {
      this.filteredTemplates = [...this.templates];
      this.filterConfig.resultsCount = this.filterConfig.totalCount;
      return;
    }
    const searchTerms = event.appliedFilters.map(f => f.value);
    this.filteredTemplates = this.templates.filter(e => eventMatchesSearchTerms(e, searchTerms));
    this.filterConfig.resultsCount = this.filteredTemplates.length;
  }
}

function eventMatchesSearchTerms(event: Template, searchTerms: string[]): boolean {
  return searchTerms.some(term => eventMatchesSearchTerm(event, term));
}

function eventMatchesSearchTerm(event: Template, searchTerm: string): boolean {
  if (!!event.name && event.name.toLowerCase().includes(searchTerm)) {
    return true;
  }
  if (!!event.description && event.description.toLowerCase().includes(searchTerm)) {
    return true;
  }
  if (!!event.provider && event.provider.toLowerCase().includes(searchTerm)) {
    return true;
  }

  return false;
}

interface Template {
  name: string;
  description: string;
  provider; string;
}

