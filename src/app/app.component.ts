import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommandChannelService } from './command-channel.service';
import { NotificationService, Notification } from 'patternfly-ng/notification';
import { Observable } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ApiService } from './api.service';
import { AuthDialogComponent } from './auth-dialog/auth-dialog.component';
import { LocalizationService } from './localization.service';

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
    private localizationService: LocalizationService
  ) { }

  ngOnInit(): void {
    this.notifications = this.notificationSvc.getNotificationsObserver;
    // check if blank token is accepted, ie no auth required for this deployment
    this.checkAuth('');
  }

  private checkAuth(token: string): void {
    this.apiService.checkAuth(token).subscribe(
      v => {
        if (v) {
          // auth passed
        } else {
          this.localizationService.getMessage('AUTH_DIALOG_MESSAGE').subscribe(message => {
            this.modalSvc.show(AuthDialogComponent, {
              initialState: {
                title: 'Auth Token',
                message,
              }
            }).content.onSave().subscribe(this.checkAuth.bind(this));
          });
        }
      },
      e => console.log(`Got failure /auth response ${e}`)
    );
  }
}
