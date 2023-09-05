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

import { EnvironmentNode, NodeType, TargetNode } from '@app/Topology/typings';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { getPersistedState } from '../utils';

const _version = '1';

export enum TopologyFilterAction {
  CATEGORY_TYPE_UPDATE = 'topology-category-type/update',
  CATEGORY_UPDATE = 'topology-category/update',
  FILTER_ADD = 'topology-filter/add',
  FILTER_DELETE = 'topology-filter/delete', // Delete a filter in a category
  FILTER_DELETE_ALL = 'topology-filter/delete-all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'topology-filter/delete-category', // Delete all filters of the same category
}

export const enumValues = new Set(Object.values(TopologyFilterAction));

export const topologyUpdateCategoryTypeIntent = createAction(
  TopologyFilterAction.CATEGORY_TYPE_UPDATE,
  (isGroup: boolean) => ({
    payload: {
      isGroup,
    },
  }),
);

export const topologyUpdateCategoryIntent = createAction(
  TopologyFilterAction.CATEGORY_UPDATE,
  (isGroup: boolean, category: string) => ({
    payload: {
      isGroup,
      category,
    },
  }),
);

export const topologyAddFilterIntent = createAction(
  TopologyFilterAction.FILTER_ADD,
  (isGroup: boolean, nodeType: NodeType, category: string, value: string) => ({
    payload: {
      isGroup,
      nodeType,
      category,
      value,
    },
  }),
);

export const topologyDeleteFilterIntent = createAction(
  TopologyFilterAction.FILTER_DELETE,
  (isGroup: boolean, nodeType: string, category: string, value: string) => ({
    payload: {
      isGroup,
      nodeType,
      category,
      value,
    },
  }),
);

export const topologyDeleteAllFiltersIntent = createAction(TopologyFilterAction.FILTER_DELETE_ALL, () => ({
  payload: {},
}));

export const topologyDeleteCategoryFiltersIntent = createAction(
  TopologyFilterAction.CATEGORY_FILTERS_DELETE,
  (isGroup: boolean, nodeType: string, category: string) => ({
    payload: {
      isGroup,
      nodeType,
      category,
    },
  }),
);

export interface TopologyFilters {
  isGroup: boolean;
  groupFilters: {
    category: string;
    filters: {
      [nodeType: string]: {
        Name: string[];
        Label: string[];
      };
    };
  };
  targetFilters: {
    category: string;
    filters: {
      Alias: string[];
      ConnectionUrl: string[];
      JvmId: string[];
      Label: string[];
      Annotation: string[];
    };
  };
}

export const categoryToNodeField = (filterCategory: string): keyof EnvironmentNode | keyof TargetNode['target'] => {
  switch (filterCategory) {
    case 'Name':
      return 'name';
    case 'Label':
      return 'labels';
    case 'Annotation':
      return 'annotations';
    case 'JvmId':
      return 'jvmId';
    case 'Alias':
      return 'alias';
    case 'ConnectionUrl':
      return 'connectUrl';
    default:
      throw new Error(`Unsupported ${filterCategory} for filters.`);
  }
};

export const defaultEmptyGroupFilters = {
  Name: [],
  Label: [],
};

export const defaultEmptyTargetFilters = {
  // Below will be taken from node.target
  Alias: [],
  ConnectionUrl: [],
  JvmId: [],
  Label: [],
  Annotation: [],
};

export const defaultTopologyFilters: TopologyFilters = {
  isGroup: false,
  groupFilters: {
    category: 'Name',
    filters: {},
  },
  targetFilters: {
    category: 'Alias',
    filters: defaultEmptyTargetFilters,
  },
};

// Representing keys. Component can pipe it via getDisplayFieldName
export const allowedTargetFilters = Object.keys(defaultEmptyTargetFilters);

export const allowedGroupFilters = Object.keys(defaultEmptyGroupFilters);

const INITIAL_STATE: TopologyFilters = getPersistedState('TOPOLOGY_FILTERS', _version, defaultTopologyFilters);

export const topologyFilterReducer: ReducerWithInitialState<TopologyFilters> = createReducer(
  INITIAL_STATE,
  (builder) => {
    builder.addCase(topologyUpdateCategoryTypeIntent, (state, { payload }) => {
      state.isGroup = payload.isGroup;
    });
    builder.addCase(topologyUpdateCategoryIntent, (state, { payload }) => {
      const { isGroup, category } = payload;
      if (isGroup) {
        state.groupFilters.category = category;
      } else {
        state.targetFilters.category = category;
      }
    });
    builder.addCase(topologyAddFilterIntent, (state, { payload }) => {
      const { isGroup, category, value, nodeType } = payload;
      if (isGroup) {
        const old = state.groupFilters.filters[nodeType] || defaultEmptyGroupFilters;
        state.groupFilters.filters[nodeType] = {
          ...old,
          [category]: [...old[category], value],
        };
      } else {
        const old: string[] = state.targetFilters.filters[category];
        state.targetFilters.filters[category] = [...old.filter((val: string) => val !== value), value];
      }
    });
    builder.addCase(topologyDeleteFilterIntent, (state, { payload }) => {
      const { isGroup, category, value, nodeType } = payload;
      if (isGroup) {
        const old = state.groupFilters.filters[nodeType] || defaultEmptyGroupFilters;
        state.groupFilters.filters[nodeType] = {
          ...old,
          [category]: old[category].filter((val: string) => val !== value),
        };
      } else {
        const old: string[] = state.targetFilters.filters[category];
        state.targetFilters.filters[category] = old.filter((val: string) => val !== value);
      }
    });
    builder.addCase(topologyDeleteCategoryFiltersIntent, (state, { payload }) => {
      const { isGroup, category, nodeType } = payload;
      if (isGroup) {
        const old = state.groupFilters.filters[nodeType] || defaultEmptyGroupFilters;
        state.groupFilters.filters[nodeType] = {
          ...old,
          [category]: [],
        };
      } else {
        state.targetFilters.filters[category] = [];
      }
    });
    builder.addCase(topologyDeleteAllFiltersIntent, (state, _) => {
      state.groupFilters = {
        category: state.groupFilters.category,
        filters: {},
      };

      state.targetFilters = {
        category: state.targetFilters.category,
        filters: defaultEmptyTargetFilters,
      };
    });
  },
);

export default topologyFilterReducer;
