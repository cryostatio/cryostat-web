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
import * as React from 'react';
import { Subscription } from 'rxjs';

export function useSubscriptions() {
  const subsRef = React.useRef([] as Subscription[]);

  React.useEffect(() => () => subsRef.current.forEach((s: Subscription): void => s.unsubscribe()), []);

  const addSubscription = (sub: Subscription): void => {
    subsRef.current = subsRef.current.concat([sub]);
  };

  return React.useCallback(addSubscription, [subsRef]);
}
