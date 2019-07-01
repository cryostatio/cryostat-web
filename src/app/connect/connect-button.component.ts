import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';
import { CommandChannelService, ListMessage } from '../command-channel.service';
import { BsDropdownDirective } from 'ngx-bootstrap/dropdown';

@Component({
  selector: 'app-connect-button',
  templateUrl: './connect-button.component.html'
})
export class ConnectButtonComponent implements OnInit, OnDestroy {
  hosts = [];
  host = '';
  hostname = '';
  connected = false;
  scanning = false;
  @ViewChild('dropdown') dropdown: BsDropdownDirective;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.dropdown.autoClose = false;
    this.subscriptions.push(
      this.svc.onResponse('scan-targets')
        .subscribe(r => {
          this.scanning = false;
          this.hosts = (r as ListMessage).payload;
          if (this.hosts.length === 1) {
            this.setHost(this.hosts[0].ip);
          }
        })
    );
    this.subscriptions.push(
      this.svc.onResponse('connect')
        .subscribe(r => {
          this.connected = r.status === 0;
          this.dropdown.hide();
          if (this.connected) {
            this.host = r.payload;
          }
        })
    );
    this.subscriptions.push(
      this.svc.onResponse('disconnect')
        .subscribe(() => {
          this.connected = false;
          this.dropdown.hide();
          this.host = '';
        })
    );
    this.svc.isReady()
      .pipe(
        filter(ready => !!ready),
        first()
      )
      .subscribe(() => {
        this.scanning = true;
        this.svc.sendMessage('scan-targets');
      });
    this.svc.onResponse('is-connected')
      .pipe(
        first(),
        filter(msg => msg.status === 0),
        map(msg => msg.payload as string),
        filter(payload => payload !== 'false'),
        map(v => v.split(':')[0])
      ).subscribe(host => {
        this.connected = true;
        this.host = host;
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setHost(host: string): void {
    if (host === 'rescan') {
      this.scanning = true;
      this.svc.sendMessage('scan-targets');
    } else if (host.trim().length > 0) {
      this.svc.sendMessage('disconnect');
      this.svc.sendMessage('connect', [ host.trim() ]);
    } else {
      this.svc.sendMessage('disconnect');
    }
  }
}

export interface JvmTarget {
  ip: string;
  hostname: string;
}
