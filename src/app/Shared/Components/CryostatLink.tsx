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

import { modalPrefillSetIntent, store } from '@app/Shared/Redux/ReduxStore';
import { toPath } from '@app/utils/utils';
import React from 'react';
import { Link, LinkProps, Path, To } from 'react-router-dom-v5-compat';

export interface CryostatLinkProps extends LinkProps {}

/**
 * Formats a To (string | Partial\<Path\>) by prepending a basepath if necessary
 * @param {string | Partial<Path>} destination - the target destination
 */
const toDestination = (destination: To) => {
  if (typeof destination === 'string') {
    return toPath(destination);
  } else if (!(destination as Partial<Path>).pathname) {
    return destination;
  }
  const pathDestination = destination as Partial<Path>;
  return {
    ...pathDestination,
    pathname: toPath(pathDestination.pathname!),
  } as Partial<Path>;
};

const resolvePathname = (destination: To): string => {
  if (typeof destination === 'string') {
    return toPath(destination);
  }
  return toPath((destination as Partial<Path>).pathname || '');
};

export const CryostatLink: React.FC<CryostatLinkProps> = ({ to, onClick, state, ...props }) => {
  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (state && typeof state === 'object' && (state as Record<string, unknown>).openCreateModal) {
        store.dispatch(modalPrefillSetIntent(resolvePathname(to), state as Record<string, unknown>));
      }
      onClick?.(e);
    },
    [to, state, onClick],
  );

  return <Link to={toDestination(to)} state={state} onClick={handleClick} {...props}></Link>;
};
