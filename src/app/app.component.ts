import { Component, OnInit } from '@angular/core';
import { CommandChannelService } from './command-channel.service';
import { NotificationService, Notification } from 'patternfly-ng/notification';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {

  notifications: Observable<Notification[]>;

  constructor(
    public svc: CommandChannelService,
    public notificationSvc: NotificationService,
  ) { }

  ngOnInit(): void {
    this.notifications = this.notificationSvc.getNotificationsObserver;
  }
}
