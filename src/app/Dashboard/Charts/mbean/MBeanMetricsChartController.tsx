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

import { ApiService, MBeanMetrics } from '@app/Shared/Services/Api.service';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { Target, TargetService } from '@app/Shared/Services/Target.service';
import {
  BehaviorSubject,
  concatMap,
  distinctUntilChanged,
  finalize,
  first,
  map,
  merge,
  Observable,
  pairwise,
  ReplaySubject,
  Subject,
  Subscription,
  tap,
  throttleTime,
} from 'rxjs';

export class MBeanMetricsChartController {
  private readonly _metrics = new Map<string, string[]>();
  private readonly _state$ = new Subject<MBeanMetrics>();
  private readonly _loading$ = new BehaviorSubject<boolean>(true);
  private readonly _refCount$ = new BehaviorSubject<number>(0);
  private readonly _updates$ = new ReplaySubject<void>(1);
  private readonly _lazy: Subscription;
  private _attach: Subscription | undefined;

  constructor(
    private readonly _api: ApiService,
    private readonly _target: TargetService,
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

  attach(category: string, fields: string[]): Observable<MBeanMetrics> {
    this._refCount$.next(this._refCount$.value + 1);
    if (!this._metrics.has(category)) {
      this._metrics.set(category, []);
    }
    this._metrics.get(category)?.push(...fields);
    return this._state$.asObservable().pipe(
      distinctUntilChanged(),
      finalize(() => {
        this._refCount$.next(this._refCount$.value - 1);
        const original = this._metrics.get(category) || [];
        const updated = [...original];
        fields.forEach((field) => {
          const idx = updated.findIndex((e) => e === field);
          if (idx >= 0) {
            updated.splice(idx, 1);
          }
        });
        this._metrics.get(category)?.push(...updated);
      })
    );
  }

  requestRefresh(): void {
    this._updates$.next();
  }

  loading(): Observable<boolean> {
    return this._loading$.asObservable().pipe(distinctUntilChanged());
  }

  _tearDown() {
    this._state$.next({});
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
      this._updates$.pipe(
        throttleTime(this._settings.chartControllerConfig().minRefresh * 1000),
        concatMap((_) => this._target.target().pipe(first()))
      ),
      this._target.target()
    )
      .pipe(
        tap((_) => this._loading$.next(true)),
        concatMap((t) => this._queryMetrics(t)),
        tap((_) => this._loading$.next(false))
      )
      .subscribe((v) => this._state$.next(v));
  }

  private _queryMetrics(target: Target): Observable<MBeanMetrics> {
    const q: string[] = [];
    const m = new Map<string, Set<string>>();
    this._metrics.forEach((fields, category) => {
      const s = m.get(category) || new Set<string>();
      fields.forEach((f) => s.add(f));
      m.set(category, s);
    });
    m.forEach((s, k) => {
      let l = `${k} {`;
      s.forEach((f) => (l += `\t${f}\n`));
      l += '}';
      q.push(l);
    });
    return this._api.getTargetMBeanMetrics(target, q);
  }
}
