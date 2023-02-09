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

import { ApiService } from '@app/Shared/Services/Api.service';
import { NotificationCategory, NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { NO_TARGET, Target, TargetService } from '@app/Shared/Services/Target.service';
import {
  BehaviorSubject,
  catchError,
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

export class ChartController {
  private readonly _state$ = new BehaviorSubject<ControllerState>(ControllerState.UNKNOWN);
  private readonly _refCount$ = new BehaviorSubject<number>(0);
  private readonly _updates$ = new ReplaySubject<void>(1);
  private readonly _lazy: Subscription;
  private _attach: Subscription | undefined;

  constructor(
    private readonly _api: ApiService,
    private readonly _target: TargetService,
    private readonly _notifications: NotificationChannel,
    private readonly _settings: SettingsService
  ) {
    this._lazy = this._refCount$
      .pipe(
        map((v) => v > 0),
        pairwise()
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
      finalize(() => this._refCount$.next(this._refCount$.value - 1))
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
        this._updates$.pipe(throttleTime(this._settings.chartControllerConfig().minRefresh)),
        this._notifications.messages(NotificationCategory.ActiveRecordingCreated),
        this._notifications.messages(NotificationCategory.ActiveRecordingDeleted),
        this._notifications.messages(NotificationCategory.ActiveRecordingStopped)
      ).pipe(switchMap((_) => this._target.target().pipe(first()))),
      this._target.target().pipe(tap((_) => this._state$.next(ControllerState.UNKNOWN)))
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

    return this._api
      .graphql<CountResponse>(
        `
          query ActiveRecordingsForAutomatedAnalysis($connectUrl: String) {
            targetNodes(filter: { name: $connectUrl }) {
              recordings {
                active (filter: {
                  labels: ["origin=${RECORDING_NAME}"],
                  state: "RUNNING",
                }) {
                aggregate {
                  count
                }
              }
            }
            }
          }`,
        { connectUrl: target.connectUrl }
      )
      .pipe(
        map((resp) => {
          const nodes = resp.data.targetNodes;
          if (nodes.length === 0) {
            return false;
          }
          const count = nodes[0].recordings.active.aggregate.count;
          return count > 0;
        }),
        catchError((_) => of(false))
      );
  }
}

interface CountResponse {
  data: {
    targetNodes: {
      recordings: {
        active: {
          aggregate: {
            count: number;
          };
        };
      };
    }[];
  };
}
