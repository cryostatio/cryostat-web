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
import { BehaviorSubject, Observable, tap, debounceTime } from 'rxjs';

export class MatchExpressionService {
  private readonly _state$ = new BehaviorSubject<string>('');

  searchExpression({
    debounceMs = 300, // ms
    immediateFn = (_: string) => {
      /* do nothing */
    },
  } = {}): Observable<string> {
    return this._state$.asObservable().pipe(tap(immediateFn), debounceTime(debounceMs));
  }

  setSearchExpression(expr: string): void {
    this._state$.next(expr);
  }
}
