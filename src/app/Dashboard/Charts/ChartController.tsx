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
import { BehaviorSubject, combineLatest, concatMap, map, Observable, of, ReplaySubject, tap, timer } from 'rxjs';

const RECORDING_NAME = 'dashboard_metrics';

export class ChartController {
  private readonly _timer$ = new ReplaySubject<number>();
  private readonly _hasRecording$ = new ReplaySubject<boolean>();

  constructor(private readonly _api: ApiService, private readonly _target: TargetService) {
    // TODO extract this interval to a configurable setting
    timer(0, 15_000)
      .pipe(map((_) => +Date.now()))
      .subscribe(this._timer$);

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
              .pipe(map((resp) => resp.data.targetNodes[0].recordings.active.aggregate.count > 0))
          );
        })
      )
      .subscribe(this._hasRecording$);

    combineLatest([this._hasRecording$, this._timer$]).subscribe((parts) => {
      const hasRecording = parts[0];
      if (!hasRecording) {
        return;
      }
      this._api.uploadActiveRecordingToGrafana(RECORDING_NAME).subscribe((resp) => console.log({ resp }));
    });
  }

  refresh(): Observable<number> {
    // return a BehaviorSubject that immediately emits the current timestamp,
    // and is subsequently updated along with all others according to the
    // global timer instance. This ensures charts refresh immediately once
    // loaded, and then all refresh in sync together later.
    const s = new BehaviorSubject(+Date.now());
    this._timer$.subscribe((_) => s.next(+Date.now()));
    return s.asObservable();
  }

  hasActiveRecording(): Observable<boolean> {
    return this._hasRecording$.asObservable();
  }

  startRecording(): Observable<boolean> {
    const attrs: RecordingAttributes = {
      name: RECORDING_NAME,
      events: 'template=Profiling,type=TARGET', // TODO make this configurable like for the automated analysis card
      options: {
        toDisk: true,
        maxAge: 60, // TODO get this from settings
      },
    };
    return this._api.createRecording(attrs).pipe(
      map((resp) => resp?.ok || false),
      tap((success) => this._hasRecording$.next(success))
    );
  }
}
