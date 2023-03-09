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
  })
);

export const topologyUpdateCategoryIntent = createAction(
  TopologyFilterAction.CATEGORY_UPDATE,
  (isGroup: boolean, category: string) => ({
    payload: {
      isGroup,
      category,
    },
  })
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
  })
);

export const topologyDeleteFilterIntent = createAction(
  TopologyFilterAction.FILTER_DELETE,
  (isGroup: boolean, nodeType: NodeType, category: string, value: string) => ({
    payload: {
      isGroup,
      nodeType,
      category,
      value,
    },
  })
);

export const topologyDeleteAllFiltersIntent = createAction(TopologyFilterAction.FILTER_DELETE_ALL, () => ({
  payload: {},
}));

export const topologyDeleteCategoryFiltersIntent = createAction(
  TopologyFilterAction.CATEGORY_FILTERS_DELETE,
  (isGroup: boolean, nodeType: NodeType, category: string) => ({
    payload: {
      isGroup,
      nodeType,
      category,
    },
  })
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
      [nodeType: string]: {
        Alias: string[];
        ConnectionUrl: string[];
        s;
        JvmId: string[];
        Label: string[];
        Annotation: string[];
      };
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
    filters: {},
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
        const old = state.targetFilters.filters[nodeType] || defaultEmptyTargetFilters;
        state.targetFilters.filters[nodeType] = {
          ...old,
          [category]: [...old[category], value],
        };
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
        const old = state.targetFilters.filters[nodeType] || defaultEmptyTargetFilters;
        state.targetFilters.filters[nodeType] = {
          ...old,
          [category]: old[category].filter((val: string) => val !== value),
        };
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
        const old = state.targetFilters.filters[nodeType] || defaultEmptyTargetFilters;
        state.targetFilters.filters[nodeType] = {
          ...old,
          [category]: [],
        };
      }
    });
    builder.addCase(topologyDeleteAllFiltersIntent, (state, _) => {
      state.groupFilters = {
        category: state.groupFilters.category,
        filters: {},
      };

      state.targetFilters = {
        category: state.targetFilters.category,
        filters: {},
      };
    });
  }
);

export default topologyFilterReducer;
