import * as React from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { nanoid } from 'nanoid';
import { Observable, Subject } from 'rxjs';

interface Notification {
  key?: string;
  title: string;
  message?: string;
  variant: AlertVariant;
  timeout?: number;
}

const DefaultNotificationTimeout = 15_000;

class Notifications {

  private readonly notifications = new Subject<Notification>();

  notify(notification: Notification): void {
    if (!notification.key) {
      notification.key = nanoid();
    }
    if (notification.timeout == undefined || notification.timeout < 0) {
      notification.timeout = DefaultNotificationTimeout;
    }
    this.notifications.next(notification);
  }

  success(title: string, message?: string, timeout?: number): void {
    this.notify({ title, message, timeout, variant: AlertVariant.success });
  }

  info(title: string, message?: string, timeout?: number): void {
    this.notify({ title, message, timeout, variant: AlertVariant.info });
  }

  warning(title: string, message?: string, timeout?: number): void {
    this.notify({ title, message, timeout, variant: AlertVariant.warning });
  }

  danger(title: string, message?: string, timeout?: number): void {
    this.notify({ title, message, timeout, variant: AlertVariant.danger });
  }

  watch(): Observable<Notification> {
    return this.notifications.asObservable();
  }

}

const NotificationsInstance = new Notifications();

const NotificationsContext = React.createContext(NotificationsInstance);

export { Notification, DefaultNotificationTimeout, Notifications, NotificationsContext, NotificationsInstance };

