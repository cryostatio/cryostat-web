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
import { SessionState } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import * as React from 'react';

export const useLogin = () => {
  const context = React.useContext(ServiceContext);
  const [loggedIn, setLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const sub = context.login
      .getSessionState()
      .subscribe((sessionState) => setLoggedIn(sessionState === SessionState.USER_SESSION));

    return () => sub.unsubscribe();
  }, [context.login, setLoggedIn]);

  return loggedIn;
};
