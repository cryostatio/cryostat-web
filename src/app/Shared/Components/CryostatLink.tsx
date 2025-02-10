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

import { BASEPATH, toPath } from '@app/utils/utils';
import React from 'react';
import { Link, LinkProps, Path, To } from 'react-router-dom-v5-compat';

export interface CryostatLinkProps extends LinkProps {}

/**
 * Formats a To (string | Partial\<Path\>) by prepending a basepath if necessary
 * @param {string | Partial<Path>} destination - the target destination
 */
const toDestination = (destination: To) => {
  if (BASEPATH) {
    if (typeof destination === 'string') {
      return toPath(destination);
    } else {
      (destination as Partial<Path>).pathname = `/${BASEPATH}${(destination as Partial<Path>).pathname}`;
      return destination as Partial<Path>;
    }
  } else {
    return destination;
  }
};

export const CryostatLink: React.FC<CryostatLinkProps> = ({ to, onClick, ...props }) => {
  return <Link to={toDestination(to)} onClick={onClick} {...props}></Link>;
};
