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

import { ApiService, RecordingState } from '@app/Shared/Services/Api.service';
import { NotificationCategory, NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { NO_TARGET, Target, TargetService } from '@app/Shared/Services/Target.service';
import {
  BehaviorSubject,
  concatMap,
  distinctUntilChanged,
  finalize,
  first,
  map,
  merge,
  Observable,
  of,
  pairwise,
  ReplaySubject,
  Subscription,
  switchMap,
  tap,
  throttleTime,
} from 'rxjs';

export const RECORDING_NAME = 'dashboard_metrics';

export enum ControllerState {
  UNKNOWN = 0,
  NO_DATA = 1,
  READY = 2,
}

export class JFRMetricsChartController {
  private readonly _state$ = new BehaviorSubject<ControllerState>(ControllerState.UNKNOWN);
  private readonly _refCount$ = new BehaviorSubject<number>(0);
  private readonly _updates$ = new ReplaySubject<void>(1);
  private readonly _lazy: Subscription;
  private _attach: Subscription | undefined;

  constructor(
    private readonly _api: ApiService,
    private readonly _target: TargetService,
    private readonly _notifications: NotificationChannel,
    private readonly _settings: SettingsService,
  ) {
    this._lazy = this._refCount$
      .pipe(
        map((v) => v > 0),
        pairwise(),
      )
      .subscribe(([prev, curr]) => {
        if (!prev && curr) {
          // first subscriber joined
          this._start();
        }
        if (prev && !curr) {
          // last subscriber left
          this._stop();
        }
      });
  }

  attach(): Observable<ControllerState> {
    this._refCount$.next(this._refCount$.value + 1);
    return this._state$.asObservable().pipe(
      distinctUntilChanged(),
      finalize(() => this._refCount$.next(this._refCount$.value - 1)),
    );
  }

  requestRefresh(): void {
    this._updates$.next();
  }

  _tearDown() {
    this._state$.next(ControllerState.UNKNOWN);
    this._lazy.unsubscribe();
    this._stop();
  }

  private _stop(): void {
    if (this._attach) {
      this._attach.unsubscribe();
      this._attach = undefined;
    }
  }

  private _start(): void {
    this._stop();
    this._attach = merge(
      merge(
        this._updates$.pipe(throttleTime(this._settings.chartControllerConfig().minRefresh * 1000)),
        this._notifications.messages(NotificationCategory.ActiveRecordingCreated),
        this._notifications.messages(NotificationCategory.ActiveRecordingDeleted),
        this._notifications.messages(NotificationCategory.ActiveRecordingStopped),
      ).pipe(switchMap((_) => this._target.target().pipe(first()))),
      this._target.target().pipe(tap((_) => this._state$.next(ControllerState.UNKNOWN))),
    )
      .pipe(concatMap((t) => this._hasRecording(t)))
      .subscribe((v) => {
        this._state$.next(v ? ControllerState.READY : ControllerState.NO_DATA);
        if (v) {
          this._api
            .uploadActiveRecordingToGrafana(RECORDING_NAME)
            .pipe(first())
            .subscribe((_) => {
              this._state$.next(ControllerState.READY);
            });
        }
      });
  }

  private _hasRecording(target: Target): Observable<boolean> {
    if (target === NO_TARGET) {
      return of(false);
    }
    return this._api.targetHasRecording(target, {
      state: RecordingState.RUNNING,
      labels: [`origin=${RECORDING_NAME}`],
    });
  }
}
