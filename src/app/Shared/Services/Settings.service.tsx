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

import { NotificationCategory } from './NotificationChannel.service';

enum StorageKeys {
  AutoRefreshEnabled = 'auto-refresh-enabled',
  AutoRefreshPeriod = 'auto-refresh-period',
  AutoRefreshUnits = 'auto-refresh-units',
  NotificationsEnabled = 'notifications-enabled',
  WebSocketDebounceMs = 'web-socket-debounce-ms',
}

export function enumKeys<O extends Object, K extends keyof O = keyof O>(obj: O): K[] {
  return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

export class SettingsService {

  setAutoRefreshEnabled(enabled: boolean): void {
    window.localStorage.setItem(StorageKeys.AutoRefreshEnabled, String(enabled));
  }

  autoRefreshEnabled(): boolean {
    return window.localStorage.getItem(StorageKeys.AutoRefreshEnabled) === 'true';
  }

  setAutoRefreshPeriod(period: number): void {
    window.localStorage.setItem(StorageKeys.AutoRefreshPeriod, String(period));
  }

  autoRefreshPeriod(defaultPeriod = 30): number {
    const raw = window.localStorage.getItem(StorageKeys.AutoRefreshPeriod)
    if (raw) {
      return Number(raw);
    }
    this.setAutoRefreshPeriod(defaultPeriod);
    return defaultPeriod;
  }

  setAutoRefreshUnits(units: number): void {
    window.localStorage.setItem(StorageKeys.AutoRefreshUnits, String(units));
  }

  autoRefreshUnits(defaultUnits = 1000): number {
    const raw = window.localStorage.getItem(StorageKeys.AutoRefreshUnits);
    if (raw) {
      return Number(raw);
    }
    this.setAutoRefreshUnits(defaultUnits);
    return defaultUnits;
  }

  notificationsEnabled(): Map<NotificationCategory, boolean> {
    const raw = window.localStorage.getItem(StorageKeys.NotificationsEnabled);
    if (!!raw) {
      try {
        const map = JSON.parse(raw);
        if (typeof map === 'object') {
          const obj = new Map(Array.from(Object.entries(map)));
          const res = new Map<NotificationCategory, boolean>();
          obj.forEach((v: any) => {
            res.set(v[0] as NotificationCategory, v[1] as boolean);
          });
          for (const c in NotificationCategory) {
            if (!res.has(NotificationCategory[c])) {
              res.set(NotificationCategory[c], true);
            }
          }
          return res;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const map = new Map<NotificationCategory, boolean>();
    for (const cat in NotificationCategory) {
      map.set(NotificationCategory[cat], true);
    }
    this.setNotificationsEnabled(map);
    return map;
  }

  notificationsEnabledFor(category: NotificationCategory): boolean {
    const res = this.notificationsEnabled().get(category);
    if (typeof res != 'boolean') {
      return true;
    }
    return res;
  }

  setNotificationsEnabled(map: Map<NotificationCategory, boolean>): void {
    const raw = JSON.stringify(Array.from(map.entries()));
    window.localStorage.setItem(StorageKeys.NotificationsEnabled, raw);
  }

  webSocketDebounceMs(defaultWebSocketDebounceMs = 100): number {
    const raw = window.localStorage.getItem(StorageKeys.WebSocketDebounceMs)
    if (raw) {
      return Number(raw);
    }
    this.setWebSocketDebounceMs(defaultWebSocketDebounceMs);
    return defaultWebSocketDebounceMs;
  }

  setWebSocketDebounceMs(debounce: number): void {
    window.localStorage.setItem(StorageKeys.WebSocketDebounceMs, String(debounce));
  }

}
