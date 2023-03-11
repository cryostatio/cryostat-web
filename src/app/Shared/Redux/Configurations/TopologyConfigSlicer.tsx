/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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

export const topologyDisplayOpionsSetIntent = createAction(
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

export const defaultDisplayOptions: DisplayOptions = {
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
};

export const showOptions: [string, string][] = Object.keys(defaultDisplayOptions.show).map((k) => {
  return [getDisplayFieldName(k), k];
});

export const groupingOptions: [string, string][] = Object.keys(defaultDisplayOptions.groupings).map((k) => {
  return [getDisplayFieldName(k), k];
});

const INITIAL_STATE: TopologyConfig = getPersistedState('TOPOLOGY_CONFIG', _version, {
  viewMode: 'graph',
  displayOptions: defaultDisplayOptions,
});

export const topologyConfigReducer: ReducerWithInitialState<TopologyConfig> = createReducer(
  INITIAL_STATE,
  (builder) => {
    builder.addCase(topologyConfigSetViewModeIntent, (state, { payload }) => {
      state.viewMode = payload.viewMode;
    });
    builder.addCase(topologyDisplayOpionsSetIntent, (state, { payload }) => {
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
