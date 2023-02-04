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

import { ApiService, RecordingAttributes } from '@app/Shared/Services/Api.service';
import { NO_TARGET, TargetService } from '@app/Shared/Services/Target.service';
import { combineLatest, concatMap, filter, map, Observable, of, ReplaySubject, Subject, tap, throttleTime } from 'rxjs';

const RECORDING_NAME = 'dashboard-metrics';

export class ChartController {
  private readonly _updateRequests$ = new Subject<void>();
  private readonly _updates$ = new Subject<number>();
  private readonly _hasRecording$ = new ReplaySubject<boolean>();

  constructor(private readonly _api: ApiService, private readonly _target: TargetService) {
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
                labels: ["template.name=Profiling", "template.type=TARGET"],
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
      .subscribe((v) => this._hasRecording$.next(v));

    this._updateRequests$.pipe(throttleTime(10_000)).subscribe((_) => this._updates$.next(+Date.now()));

    this._target
      .target()
      .pipe(filter((v) => v !== NO_TARGET))
      .subscribe((_) => this._updates$.next(+Date.now()));

    combineLatest([this.hasActiveRecording().pipe(filter((v) => v)), this._updates$]).subscribe((_) => {
      this._api.uploadActiveRecordingToGrafana(RECORDING_NAME).subscribe((_) => {
        /* do nothing */
      });
    });
  }

  refresh(): Observable<number> {
    return this._updates$.asObservable();
  }

  requestRefresh(): void {
    this._updateRequests$.next();
  }

  hasActiveRecording(): Observable<boolean> {
    return this._hasRecording$.asObservable();
  }

  startRecording(): Observable<boolean> {
    const attrs: RecordingAttributes = {
      name: RECORDING_NAME,
      // TODO make this configurable like for the automated analysis card
      events: 'template=Profiling,type=TARGET',
      options: {
        toDisk: true,
        // TODO get this from settings? this should probably somehow be the maximum data window width of
        // all configured dashboard cards. But how to handle when a new card is added with a new maximum?
        // Restart recording?
        maxAge: 60,
      },
    };
    return this._api.createRecording(attrs).pipe(
      map((resp) => resp?.ok || false),
      tap((success) => this._hasRecording$.next(success)),
      tap((_) => this._updates$.next(+Date.now()))
    );
  }
}
