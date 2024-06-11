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

import _ from 'lodash';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, first, map, tap } from 'rxjs/operators';
import { ApiService } from './Api.service';
import { Target, NotificationCategory, TargetDiscoveryEvent } from './api.types';
import { LoginService } from './Login.service';
import { NotificationChannel } from './NotificationChannel.service';
import { NotificationService } from './Notifications.service';

export class TargetsService {
  private readonly _targets$: BehaviorSubject<Target[]> = new BehaviorSubject<Target[]>([]);

  constructor(
    private readonly api: ApiService,
    private readonly notifications: NotificationService,
    login: LoginService,
    notificationChannel: NotificationChannel,
  ) {
    // just trigger a startup query
    this.queryForTargets().subscribe();

    notificationChannel.messages(NotificationCategory.TargetJvmDiscovery).subscribe((v) => {
      const evt: TargetDiscoveryEvent = v.message.event;
      switch (evt.kind) {
        case 'FOUND':
          this._targets$.next(_.unionBy(this._targets$.getValue(), [evt.serviceRef], (t) => t.connectUrl));
          break;
        case 'LOST':
          this._targets$.next(_.filter(this._targets$.getValue(), (t) => t.connectUrl !== evt.serviceRef.connectUrl));
          break;
        case 'MODIFIED':
          {
            const idx = _.findIndex(this._targets$.getValue(), (t) => t.connectUrl === evt.serviceRef.connectUrl);
            if (idx >= 0) {
              this._targets$.getValue().splice(idx, 1, evt.serviceRef);
              this._targets$.next([...this._targets$.getValue()]);
            }
          }
          break;
        default:
          break;
      }
    });
  }

  queryForTargets(): Observable<void> {
    return this.api.doGet<Target[]>(`targets`).pipe(
      first(),
      tap((targets) => this._targets$.next(targets)),
      map(() => undefined),
      catchError((err) => {
        this.notifications.danger('Target List Update Failed', JSON.stringify(err));
        return of(undefined);
      }),
    );
  }

  targets(): Observable<Target[]> {
    return this._targets$.asObservable();
  }
}
