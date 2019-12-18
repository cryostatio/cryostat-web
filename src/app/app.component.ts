import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommandChannelService } from './command-channel.service';
import { NotificationService, Notification } from 'patternfly-ng/notification';
import { Observable } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {

  notifications: Observable<Notification[]>;

  constructor(
    public svc: CommandChannelService,
    private apiService: ApiService,
    public notificationSvc: NotificationService,
    public modalSvc: BsModalService,
  ) { }

  ngOnInit(): void {
    this.notifications = this.notificationSvc.getNotificationsObserver;
    this.apiService.checkAuth('TOKEN').subscribe(
      v => console.log(`Got success /auth response ${v}`),
      e => console.log(`Got failure /auth response ${e}`)
    );
  }
}
