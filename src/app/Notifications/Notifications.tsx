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
import { AlertVariant } from '@patternfly/react-core';
import { nanoid } from 'nanoid';
import { Observable, Subject } from 'rxjs';

export interface Notification {
  key?: string;
  title: string;
  message?: string;
  variant: AlertVariant;
  timeout?: number;
}

const DefaultNotificationTimeout = 15_000;

export class Notifications {

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

export { DefaultNotificationTimeout, NotificationsContext, NotificationsInstance };

