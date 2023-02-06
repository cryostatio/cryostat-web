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
import { NO_TARGET, TargetService } from '@app/Shared/Services/Target.service';
import {
  BehaviorSubject,
  combineLatest,
  concatMap,
  filter,
  finalize,
  map,
  Observable,
  of,
  pairwise,
  ReplaySubject,
  Subject,
  Subscription,
  throttleTime,
} from 'rxjs';

export const RECORDING_NAME = 'dashboard_metrics';

// TODO make this configurable
export const MIN_REFRESH = 10_000;

export class ChartController {
  private readonly _refCount$ = new BehaviorSubject<number>(0);
  private readonly _updateRequests$ = new Subject<void>();
  private readonly _updates$ = new ReplaySubject<number>();
  private readonly _hasRecording$ = new ReplaySubject<boolean>();
  private readonly _subscriptions: Subscription[] = [];

  constructor(private readonly _api: ApiService, private readonly _target: TargetService) {
    this._refCount$
      .pipe(
        map((v) => v > 0),
        pairwise()
      )
      .subscribe((v) => {
        const prev = v[0];
        const curr = v[1];
        if (prev && !curr) {
          // last subscriber left
          this._subscriptions.forEach((s) => s.unsubscribe());
        }
        if (!prev && curr) {
          // first subscriber joined
          this._init();
        }
      });
  }

  refresh(): Observable<number> {
    this._refCount$.next(this._refCount$.value + 1);
    return this._updates$.asObservable().pipe(finalize(() => this._refCount$.next(this._refCount$.value - 1)));
  }

  requestRefresh(): void {
    this._updateRequests$.next();
  }

  hasActiveRecording(): Observable<boolean> {
    return this._hasRecording$.asObservable();
  }

  private _init(): void {
    this._subscriptions.push(
      this._target
        .target()
        .pipe(
          concatMap((target) => {
            if (target === NO_TARGET) {
              return of(false);
            }

            return (
              this._api
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                .graphql<any>(
                  `
          query ActiveRecordingsForAutomatedAnalysis($connectUrl: String) {
            targetNodes(filter: { name: $connectUrl }) {
              recordings {
                active (filter: {
                  labels: ["origin=${RECORDING_NAME}"],
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
                // TODO error handling
                .pipe(map((resp) => resp.data.targetNodes[0].recordings.active.aggregate.count > 0))
            );
          })
        )
        .subscribe((v) => this._hasRecording$.next(v))
    );

    this._subscriptions.push(
      this._updateRequests$.pipe(throttleTime(MIN_REFRESH)).subscribe((_) => this._updates$.next(+Date.now()))
    );

    this._subscriptions.push(
      this._target
        .target()
        .pipe(filter((v) => v !== NO_TARGET))
        .subscribe((_) => this._updates$.next(+Date.now()))
    );

    this._subscriptions.push(
      combineLatest([this.hasActiveRecording().pipe(filter((v) => v)), this._updates$]).subscribe((_) => {
        this._api.uploadActiveRecordingToGrafana(RECORDING_NAME).subscribe((_) => {
          /* do nothing */
        });
      })
    );

    // TODO listen for websocket notifications about active recordings and update the hasRecording
    // state accordingly
    // combineLatest([
    //   context.target.target(),
    //   merge(
    //     context.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated),
    //     context.notificationChannel.messages(NotificationCategory.SnapshotCreated)
    //   ),
    // ]).subscribe(([currentTarget, event]) => {
    //   if (currentTarget.connectUrl != event.message.target) {
    //     return;
    //   }
    //   setRecordings((old) => old.concat([event.message.recording]));
    // })

    // combineLatest([
    //   context.target.target(),
    //   merge(
    //     context.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted),
    //     context.notificationChannel.messages(NotificationCategory.SnapshotDeleted)
    //   ),
    // ]).subscribe(([currentTarget, event]) => {
    //   if (currentTarget.connectUrl != event.message.target) {
    //     return;
    //   }

    //   setRecordings((old) => old.filter((r) => r.name !== event.message.recording.name));
    //   setCheckedIndices((old) => old.filter((idx) => idx !== event.message.recording.id));
    // })

    // combineLatest([
    //   context.target.target(),
    //   context.notificationChannel.messages(NotificationCategory.ActiveRecordingStopped),
    // ]).subscribe(([currentTarget, event]) => {
    //   if (currentTarget.connectUrl != event.message.target) {
    //     return;
    //   }
    //   setRecordings((old) => {
    //     const updated = [...old];
    //     for (const r of updated) {
    //       if (r.name === event.message.recording.name) {
    //         r.state = RecordingState.STOPPED;
    //       }
    //     }
    //     return updated;
    //   });
    // })
  }
}
