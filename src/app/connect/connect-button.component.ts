import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { CommandChannelService, ListMessage } from '../command-channel.service';

@Component({
  selector: 'app-connect-button',
  templateUrl: './connect-button.component.html'
})
export class ConnectButtonComponent implements OnInit, OnDestroy {
  hosts = [];
  host = '';

  private readonly subscriptions: Subscription[] = [];

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('port-scan')
        .subscribe(r => this.hosts = (r as ListMessage).payload)
    );
    this.svc.isReady()
      .pipe(
        filter(ready => !!ready),
        first()
      )
      .subscribe(() => {
        this.svc.sendMessage('port-scan');
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  fire(): void {
    if (this.host === 'rescan') {
      this.hosts = [];
      this.svc.sendMessage('port-scan');
    } else if (this.host.trim().length > 0) {
      this.svc.sendMessage('connect', [ this.host.trim() ]);
    } else {
      this.svc.sendMessage('disconnect');
    }
    this.host = '';
  }
}

export interface JvmTarget {
  ip: string;
  hostname: string;
}
