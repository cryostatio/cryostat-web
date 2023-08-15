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

import { getDisplayFieldName } from '@app/utils/utils';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { getPersistedState } from '../utils';

const _version = '1';

export enum TopologyConfigAction {
  VIEW_MODE_SET = 'topology-config/set-view-mode',
  DISPLAY_OPTION_SET = 'topology-config/set-dislay-options',
}

export const enumValues = new Set(Object.values(TopologyConfigAction));

export type ViewMode = 'graph' | 'list';

export interface DisplayOptions {
  show: {
    connectionUrl: boolean;
    badge: boolean;
    status: boolean;
    icon: boolean;
  };
  groupings: {
    collapseSingles: boolean;
    realmOnly: boolean;
  };
}

export type OptionCategory = 'show' | 'groupings';

export interface TopologySetViewModeActionPayload {
  viewMode: ViewMode;
}

export interface TopologySetDisplayOptionsActionPayload {
  category: string;
  key: string;
  value: boolean;
}

export const topologyConfigSetViewModeIntent = createAction(
  TopologyConfigAction.VIEW_MODE_SET,
  (viewMode: ViewMode) => ({
    payload: {
      viewMode,
    } as TopologySetViewModeActionPayload,
  })
);

export const topologyDisplayOptionsSetIntent = createAction(
  TopologyConfigAction.DISPLAY_OPTION_SET,
  (category: OptionCategory, key: string, value: boolean) => ({
    payload: {
      category,
      key,
      value,
    } as TopologySetDisplayOptionsActionPayload,
  })
);

export interface TopologyConfig {
  viewMode: ViewMode;
  displayOptions: DisplayOptions;
}

export const defaultTopologyConfig: TopologyConfig = {
  viewMode: 'graph',
  displayOptions: {
    show: {
      connectionUrl: false,
      badge: true,
      status: true,
      icon: true,
    },
    groupings: {
      realmOnly: false,
      collapseSingles: false,
    },
  },
};

export const showOptions: [string, string][] = Object.keys(defaultTopologyConfig.displayOptions.show).map((k) => {
  return [getDisplayFieldName(k), k];
});

export const groupingOptions: [string, string][] = Object.keys(defaultTopologyConfig.displayOptions.groupings).map(
  (k) => {
    return [getDisplayFieldName(k), k];
  }
);

const INITIAL_STATE: TopologyConfig = getPersistedState('TOPOLOGY_CONFIG', _version, defaultTopologyConfig);

export const topologyConfigReducer: ReducerWithInitialState<TopologyConfig> = createReducer(
  INITIAL_STATE,
  (builder) => {
    builder.addCase(topologyConfigSetViewModeIntent, (state, { payload }) => {
      state.viewMode = payload.viewMode;
    });
    builder.addCase(topologyDisplayOptionsSetIntent, (state, { payload }) => {
      const { category, key, value } = payload;
      if (state.displayOptions[category]) {
        state.displayOptions[category][key] = value;
      } else {
        state.displayOptions[category] = {
          [key]: value,
        };
      }

      // Special case for groupings
      // If realmOnly is true, singleGroups should also be true
      if (category === 'groupings' && key === 'realmOnly') {
        if (value) {
          state.displayOptions.groupings.collapseSingles = true;
        }
      }
    });
  }
);

export default topologyConfigReducer;
