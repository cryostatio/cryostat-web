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
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';

export interface CreateModalLocationState {
  openCreateModal?: boolean;
}

export function useModalFromLocationState(
  key: string = 'openCreateModal',
): [boolean, React.Dispatch<React.SetStateAction<boolean>>, () => void] {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if ((location.state as Record<string, unknown> | null)?.[key]) {
      setIsOpen(true);
    }
  }, [location.state, key]);

  const close = React.useCallback(() => {
    setIsOpen(false);
    if (location.state) {
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    }
  }, [navigate, location.pathname, location.search, location.hash, location.state]);

  return [isOpen, setIsOpen, close];
}
