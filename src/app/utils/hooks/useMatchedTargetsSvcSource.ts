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
import { Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import * as React from 'react';
import { BehaviorSubject, combineLatest, switchMap, catchError, of } from 'rxjs';
import { useMatchExpressionSvc } from './useMatchExpressionSvc';
import { useSubscriptions } from './useSubscriptions';

export const useMatchedTargetsSvcSource = (): BehaviorSubject<Target[] | undefined> => {
  const matchedTargetsSvcRef = React.useRef(new BehaviorSubject<Target[] | undefined>(undefined));
  const matchExprService = useMatchExpressionSvc();
  const svc = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    addSubscription(
      combineLatest([matchExprService.searchExpression(), svc.targets.targets()])
        .pipe(
          switchMap(([input, targets]) =>
            input ? svc.api.matchTargetsWithExpr(input, targets).pipe(catchError((_) => of([]))) : of(undefined),
          ),
        )
        .subscribe((ts) => {
          matchedTargetsSvcRef.current.next(ts);
        }),
    );
  }, [svc.targets, svc.api, matchExprService, addSubscription]);

  return matchedTargetsSvcRef.current;
};
