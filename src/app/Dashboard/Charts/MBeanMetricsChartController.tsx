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
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { Target, TargetService } from '@app/Shared/Services/Target.service';
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
    return this._api
      .graphql<MBeanMetricsResponse>(
        `
          query MBeanMXMetricsForTarget($connectUrl: String) {
            targetNodes(filter: { name: $connectUrl }) {
              mbeanMetrics {
                ${q.join('\n')}
              }
            }
          }`,
        { connectUrl: target.connectUrl }
      )
      .pipe(
        map((resp) => {
          const nodes = resp.data.targetNodes;
          if (!nodes || nodes.length === 0) {
            return {};
          }
          return nodes[0]?.mbeanMetrics;
        }),
        catchError((_) => of({}))
      );
  }
}

export interface MemoryMetric {
  init: number;
  used: number;
  committed: number;
  max: number;
}

export interface MBeanMetrics {
  thread?: {
    threadCount?: number;
    daemonThreadCount?: number;
  };
  os?: {
    systemCpuLoad?: number;
    systemLoadAverage?: number;
    processCpuLoad?: number;
    totalPhysicalMemorySize?: number;
    freePhysicalMemorySize?: number;
  };
  memory?: {
    heapMemoryUsage?: MemoryMetric;
    nonHeapMemoryUsage?: MemoryMetric;
    heapMemoryUsagePercent?: number;
  };
  // runtime: {};
}

export interface MBeanMetricsResponse {
  data: {
    targetNodes: {
      mbeanMetrics: MBeanMetrics;
    }[];
  };
}
