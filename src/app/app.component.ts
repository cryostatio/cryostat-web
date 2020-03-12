import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommandChannelService } from './command-channel.service';
import { NotificationService, Notification } from 'patternfly-ng/notification';
import { Observable } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ApiService } from './api.service';
import { AuthDialogComponent } from './auth-dialog/auth-dialog.component';
import { first } from 'rxjs/operators';

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
    // check if blank token is accepted, ie no auth required for this deployment
    this.checkAuth('', 'Basic');
  }

  private checkAuth(token: string, method: string): void {
    this.apiService.checkAuth(token, method).subscribe(
      v => {
        if (v) {
          // auth passed
        } else {
          this.apiService.getAuthMethod()
            .pipe(first())
            .subscribe(method => {
              if (method === 'Bearer') {
                this.modalSvc.show(AuthDialogComponent, {
                  initialState: {
                    title: 'Authorization',
                    message: 'ContainerJFR connection requires a platform auth token to validate user authorization. '
                    + 'Please enter a valid access token for your user account. For example, if this is an OpenShift '
                    + 'deployment, you can enter the token given by "oc whoami --show-token".'
                  }
                })
                  .content.onSave().subscribe(token => this.checkAuth(token, method));
              } else if (method === 'Basic') {
                this.modalSvc.show(AuthDialogComponent, {
                  initialState: {
                    title: 'Authorization',
                    message: 'ContainerJFR connection requires HTTP Basic to validate user authorization. '
                    + 'Please enter your credentials in the format "username:password".'
                  }
                })
                  .content.onSave().subscribe(token => this.checkAuth(btoa(token), method));
              } else {
                window.alert(`Unknown authorization method ${method}`);
              }
            });
        }
      },
      e => console.log(`Got failure /auth response ${e}`)
    );
  }
}
