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
  hostname = '';

  private readonly subscriptions: Subscription[] = [];

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.svc.onResponse('port-scan')
        .subscribe(r => {
          this.hosts = (r as ListMessage).payload;
          if (this.hosts.length === 1) {
            this.setHost(this.hosts[0].ip);
          }
        })
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

  setHost(host: string): void {
    if (host === 'rescan') {
      this.hosts = [];
      this.host = '';
      this.svc.sendMessage('port-scan');
    } else if (host.trim().length > 0) {
      this.svc.sendMessage('disconnect');
      this.svc.sendMessage('connect', [ host.trim() ]);
      this.host = host;
    } else {
      this.svc.sendMessage('disconnect');
      this.host = '';
    }
  }
}

export interface JvmTarget {
  ip: string;
  hostname: string;
}
