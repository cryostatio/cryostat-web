/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { AlertVariant } from '@patternfly/react-core';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { BehaviorSubject, Observable } from 'rxjs';
import { concatMap, filter, first, map } from 'rxjs/operators';

export interface Notification {
  hidden?: boolean;
  read?: boolean;
  key?: string;
  title: string;
  message?: string | Error;
  category?: string;
  variant: AlertVariant;
  timestamp?: number;
}

export class Notifications {
  private readonly _notifications$: BehaviorSubject<Notification[]> = new BehaviorSubject<Notification[]>([]);
  private readonly _drawerState$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    this._drawerState$
      .pipe(
        filter((v) => v),
        concatMap(() => this._notifications$.pipe(first())),
      )
      .subscribe((prev) =>
        this._notifications$.next(
          prev.map((n) => ({
            ...n,
            hidden: true,
          })),
        ),
      );
  }

  drawerState(): Observable<boolean> {
    return this._drawerState$.asObservable();
  }

  setDrawerState(state: boolean): void {
    this._drawerState$.next(state);
  }

  notify(notification: Notification): void {
    if (!notification.key) {
      notification.key = nanoid();
    }
    notification.read = false;
    if (notification.hidden === undefined) {
      notification.hidden = this._drawerState$.getValue();
    }
    notification.timestamp = +Date.now();
    if (notification.message instanceof Error) {
      notification.message = JSON.stringify(notification.message, Object.getOwnPropertyNames(notification.message));
    } else if (typeof notification.message !== 'string') {
      notification.message = JSON.stringify(notification.message);
    }
    this._notifications$.pipe(first()).subscribe((prev) => {
      prev.unshift(notification);
      this._notifications$.next(prev);
    });
  }

  success(title: string, message?: string | Error, category?: string, hidden?: boolean): void {
    this.notify({ title, message, category, variant: AlertVariant.success, hidden });
  }

  info(title: string, message?: string | Error, category?: string, hidden?: boolean): void {
    this.notify({ title, message, category, variant: AlertVariant.info, hidden });
  }

  warning(title: string, message?: string | Error, category?: string): void {
    this.notify({ title, message, category, variant: AlertVariant.warning });
  }

  danger(title: string, message?: string | Error, category?: string): void {
    this.notify({ title, message, category, variant: AlertVariant.danger });
  }

  notifications(): Observable<Notification[]> {
    return this._notifications$.asObservable();
  }

  unreadNotifications(): Observable<Notification[]> {
    return this.notifications().pipe(map((a) => a.filter((n) => !n.read)));
  }

  actionsNotifications(): Observable<Notification[]> {
    return this.notifications().pipe(map((a) => a.filter((n) => this.isActionNotification(n))));
  }

  cryostatStatusNotifications(): Observable<Notification[]> {
    return this.notifications().pipe(
      map((a) =>
        a.filter(
          (n) => (this.isWsClientActivity(n) || this.isJvmDiscovery(n)) && !Notifications.isProblemNotification(n),
        ),
      ),
    );
  }

  problemsNotifications(): Observable<Notification[]> {
    return this.notifications().pipe(map((a) => a.filter(Notifications.isProblemNotification)));
  }

  setHidden(key?: string, hidden = true): void {
    if (!key) {
      return;
    }
    this._notifications$.pipe(first()).subscribe((prev) => {
      for (const n of prev) {
        if (n.key === key) {
          n.hidden = hidden;
        }
      }
      this._notifications$.next(prev);
    });
  }

  setRead(key?: string, read = true): void {
    if (!key) {
      return;
    }
    this._notifications$.pipe(first()).subscribe((prev) => {
      for (const n of prev) {
        if (n.key === key) {
          n.read = read;
        }
      }
      this._notifications$.next(prev);
    });
  }

  markAllRead(): void {
    this._notifications$.pipe(first()).subscribe((prev) => {
      for (const n of prev) {
        n.read = true;
      }
      this._notifications$.next(prev);
    });
  }

  clearAll(): void {
    this._notifications$.next([]);
  }

  private isActionNotification(n: Notification): boolean {
    return !this.isWsClientActivity(n) && !this.isJvmDiscovery(n) && !Notifications.isProblemNotification(n);
  }

  private isWsClientActivity(n: Notification): boolean {
    return n.category === NotificationCategory.WsClientActivity;
  }

  private isJvmDiscovery(n: Notification): boolean {
    return n.category === NotificationCategory.TargetJvmDiscovery;
  }

  static isProblemNotification(n: Notification): boolean {
    return n.variant === AlertVariant.warning || n.variant === AlertVariant.danger;
  }
}

const NotificationsInstance = new Notifications();

const NotificationsContext = React.createContext(NotificationsInstance);

export { NotificationsContext, NotificationsInstance };
