/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as React from 'react';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AlertVariant } from '@patternfly/react-core';
import { nanoid } from 'nanoid';

export interface Notification {
  read?: boolean;
  key?: string;
  title: string;
  message?: string;
  category?: string;
  variant: AlertVariant;
  timestamp?: number;
}

export interface NotificationDrawerCategory {
  title: string;
  isExpanded: boolean;
  notifications: Notification[];
  unreadCount: number;
}

export class Notifications {

  private readonly _notifications: Notification[] = [];
  private readonly _notifications$: BehaviorSubject<Notification[]> = new BehaviorSubject<Notification[]>(this._notifications);

  notify(notification: Notification): void {
    if (!notification.key) {
      notification.key = nanoid();
    }
    notification.read = false;
    notification.timestamp = +Date.now();
    this._notifications.unshift(notification);
    this._notifications$.next(this._notifications);
  }

  success(title: string, message?: string, category?: string): void {
    this.notify({ title, message, category, variant: AlertVariant.success });
  }

  info(title: string, message?: string, category?: string): void {
    this.notify({ title, message, category, variant: AlertVariant.info });
  }

  warning(title: string, message?: string, category?: string): void {
    this.notify({ title, message, category, variant: AlertVariant.warning });
  }

  danger(title: string, message?: string, category?: string): void {
    this.notify({ title, message, category, variant: AlertVariant.danger });
  }

  notifications(): Observable<Notification[]> {
    return this._notifications$.asObservable();
  }

  unreadNotifications(): Observable<Notification[]> {
    return this.notifications()
    .pipe(
      map(a => a.filter(n => !n.read))
    );
  }

  actionsNotifications(): Observable<Notification[]> {
    return this.notifications()
    .pipe(
      map(a => a.filter(this.isActionNotification))
    );
  }

  networkInfoNotifications(): Observable<Notification[]> {
    return this.notifications()
    .pipe(
      map(a => a.filter(this.isNetworkInfoNotification))
    );
  }

  problemsNotifications(): Observable<Notification[]> {
    return this.notifications()
    .pipe(
      map(a => a.filter(this.isProblemNotification))
    );
  }

  setRead(key?: string, read: boolean = true): void {
    if (!key) {
      return;
    }
    for (let n of this._notifications) {
      if (n.key === key) {
        n.read = read;
      }
    }
    this._notifications$.next(this._notifications);
  }

  markAllRead(): void {
    for (let n of this._notifications) {
      n.read = true;
    }
    this._notifications$.next(this._notifications);
  }

  clearAll(): void {
    while (this._notifications.length > 0) {
      this._notifications.shift();
    }
    this._notifications$.next(this._notifications);
  }

  private isActionNotification(n: Notification): boolean {
    return (n.category !== 'WsClientActivity' && n.category !== 'TargetJvmDiscovery')
      && (n.variant === AlertVariant.success || n.variant === AlertVariant.info);
  }

  private isNetworkInfoNotification(n: Notification): boolean {
    return (n.category === 'WsClientActivity' || n.category === 'TargetJvmDiscovery')
      && (n.variant === AlertVariant.info);
  }

  private isProblemNotification(n: Notification): boolean {
    return (n.variant === AlertVariant.warning) || (n.variant === AlertVariant.danger);
  }
}

const NotificationsInstance = new Notifications();

const NotificationsContext = React.createContext(NotificationsInstance);

export { NotificationsContext, NotificationsInstance };

