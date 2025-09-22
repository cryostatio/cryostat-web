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

import { createAction, createReducer } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';

const _version = '1';

export enum NavMenuAction {
  MENU_SET_EXPANDED_STATE = 'main-nav-menu/set-expanded-state',
}

export const enumValues = new Set(Object.values(NavMenuAction));

export interface NavMenuConfig {
  states: {};
  readonly _version: string;
}

export const navMenuSetExpandedIntent = createAction(
  NavMenuAction.MENU_SET_EXPANDED_STATE,
  (item: string, expanded: boolean) => ({
    payload: {
      item,
      expanded,
    },
  }),
);

export const defaultNavMenuConfigs = {
  _version,
  states: {},
};

const INITIAL_STATE: NavMenuConfig = getPersistedState('NAV_MENU_CFG', _version, defaultNavMenuConfigs);

export const navMenuConfigReducer = createReducer(INITIAL_STATE, (builder) => {
  builder.addCase(navMenuSetExpandedIntent, (state, { payload }) => {
    state.states[payload.item] = payload.expanded;
  });
});

export default navMenuConfigReducer;
