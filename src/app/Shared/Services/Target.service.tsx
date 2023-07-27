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
import { Observable, Subject, BehaviorSubject } from 'rxjs';

export const NO_TARGET = {} as Target;

export const includesTarget = (arr: Target[], target: Target): boolean => {
  return arr.some((t) => t.connectUrl === target.connectUrl);
};

export const isEqualTarget = (a: Target, b: Target): boolean => {
  return a.connectUrl === b.connectUrl;
};

export const indexOfTarget = (arr: Target[], target: Target): number => {
  let index = -1;
  arr.forEach((t, idx) => {
    if (t.connectUrl === target.connectUrl) {
      index = idx;
    }
  });
  return index;
};

export const getTargetRepresentation = (t: Target) =>
  !t.alias || t.alias === t.connectUrl ? `${t.connectUrl}` : `${t.alias} (${t.connectUrl})`;

export const isTargetAgentHttp = (t: Target) => t.connectUrl.startsWith('http');

export interface Target {
  jvmId?: string; // present in responses, but we do not need to provide it in requests
  connectUrl: string;
  alias: string;
  labels?: object;
  annotations?: {
    cryostat: object;
    platform: object;
  };
}

class TargetService {
  private readonly _target: Subject<Target> = new BehaviorSubject(NO_TARGET);
  private readonly _authFailure: Subject<void> = new Subject();
  private readonly _authRetry: Subject<void> = new Subject();
  private readonly _sslFailure: Subject<void> = new Subject();

  setTarget(target: Target): void {
    if (target === NO_TARGET || !!target.connectUrl) {
      this._target.next(target);
    } else {
      throw new Error('Malformed target');
    }
  }

  target(): Observable<Target> {
    return this._target.asObservable();
  }

  authFailure(): Observable<void> {
    return this._authFailure.asObservable();
  }

  setAuthFailure(): void {
    this._authFailure.next();
  }

  authRetry(): Observable<void> {
    return this._authRetry.asObservable();
  }

  setAuthRetry(): void {
    this._authRetry.next();
  }

  sslFailure(): Observable<void> {
    return this._sslFailure.asObservable();
  }

  setSslFailure(): void {
    this._sslFailure.next();
  }
}

const TargetInstance = new TargetService();

export { TargetService, TargetInstance };
