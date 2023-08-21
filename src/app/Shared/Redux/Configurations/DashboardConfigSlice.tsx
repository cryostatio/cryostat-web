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

import { MBeanMetricsChartCardDescriptor } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartCard';
import {
  DashboardLayout,
  LayoutTemplate,
  LayoutTemplateRecord,
  LayoutTemplateVendor,
} from '@app/Dashboard/dashboard-utils';
import { move, swap } from '@app/utils/utils';
import { gridSpans } from '@patternfly/react-core';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';

export const _version = '4';

// Common action string format: "resource(s)/action"
export enum DashboardConfigAction {
  CARD_ADD = 'dashboard-card-config/add',
  CARD_REMOVE = 'dashboard-card-config/remove',
  CARD_REORDER = 'dashboard-card-config/reorder',
  CARD_RESIZE = 'dashboard-card-config/resize',
  FIRST_RUN = 'dashboard-card-config/first-run',
  LAYOUT_ADD = 'layout-config/add',
  LAYOUT_REMOVE = 'layout-config/remove',
  LAYOUT_RENAME = 'layout-config/rename',
  LAYOUT_REPLACE = 'layout-config/replace',
  LAYOUT_FAVORITE = 'layout-config/favorite',
  TEMPLATE_ADD = 'template-config/add',
  TEMPLATE_REMOVE = 'template-config/remove',
  TEMPLATE_RENAME = 'template-config/rename',
  TEMPLATE_HISTORY_PUSH = 'template-history/push',
  TEMPLATE_HISTORY_CLEAR = 'template-history/clear',
  LAYOUT_CLEAR = 'dashboard-card-config/layout-clear',
}

export const enumValues = new Set(Object.values(DashboardConfigAction));

export interface DashboardAddConfigActionPayload {
  id: string;
  name: string;
  span: gridSpans;
  props: object;
}

export interface DashboardDeleteConfigActionPayload {
  idx: number;
}

export interface DashboardResizeConfigActionPayload {
  idx: number;
  span: gridSpans;
}

export interface DashboardOrderConfigActionPayload {
  prevOrder: number;
  nextOrder: number;
  swap: boolean;
}

export interface DashboardFirstRunActionPayload {}

export interface DashboardAddLayoutActionPayload {
  layout: DashboardLayout;
}

export interface DashboardDeleteLayoutActionPayload {
  name: string;
}

export interface DashboardRenameLayoutActionPayload {
  oldName: string;
  newName: string;
}
export interface DashboardReplaceLayoutActionPayload {
  newLayoutName: string;
}

export interface DashboardFavoriteLayoutActionPayload {
  name: string;
}

export interface DashboardAddTemplateActionPayload {
  template: LayoutTemplate;
}

export interface DashboardDeleteTemplateActionPayload {
  name: string;
}

export interface DashboardRenameTemplateActionPayload {
  oldName: string;
  newName: string;
}
export interface DashboardHistoryPushTemplateActionPayload {
  template: LayoutTemplate;
}

export interface DashboardHistoryClearTemplateActionPayload {}

export interface DashboardLayoutClearActionPayload {}

export const dashboardConfigAddCardIntent = createAction(
  DashboardConfigAction.CARD_ADD,
  (id: string, name: string, span: gridSpans, props: object) => ({
    payload: {
      id,
      name,
      span,
      props,
    } as DashboardAddConfigActionPayload,
  })
);

export const dashboardConfigDeleteCardIntent = createAction(DashboardConfigAction.CARD_REMOVE, (idx: number) => ({
  payload: {
    idx,
  } as DashboardDeleteConfigActionPayload,
}));

export const dashboardConfigResizeCardIntent = createAction(
  DashboardConfigAction.CARD_RESIZE,
  (idx: number, span: gridSpans) => ({
    payload: {
      idx,
      span,
    } as DashboardResizeConfigActionPayload,
  })
);

export const dashboardConfigReorderCardIntent = createAction(
  DashboardConfigAction.CARD_REORDER,
  (prevOrder: number, nextOrder: number, swap = false) => ({
    payload: {
      prevOrder,
      nextOrder,
      swap,
    } as DashboardOrderConfigActionPayload,
  })
);

export const dashboardConfigFirstRunIntent = createAction(DashboardConfigAction.FIRST_RUN, () => ({
  payload: {} as DashboardFirstRunActionPayload,
}));

export const dashboardConfigCreateLayoutIntent = createAction(
  DashboardConfigAction.LAYOUT_ADD,
  (layout: DashboardLayout) => ({
    payload: {
      layout,
    } as DashboardAddLayoutActionPayload,
  })
);

export const dashboardConfigDeleteLayoutIntent = createAction(DashboardConfigAction.LAYOUT_REMOVE, (name: string) => ({
  payload: {
    name,
  } as DashboardDeleteLayoutActionPayload,
}));

export const dashboardConfigRenameLayoutIntent = createAction(
  DashboardConfigAction.LAYOUT_RENAME,
  (oldName: string, newName: string) => ({
    payload: {
      oldName,
      newName,
    } as DashboardRenameLayoutActionPayload,
  })
);

export const dashboardConfigReplaceLayoutIntent = createAction(
  DashboardConfigAction.LAYOUT_REPLACE,
  (name: string) => ({
    payload: {
      newLayoutName: name,
    } as DashboardReplaceLayoutActionPayload,
  })
);

export const dashboardConfigFavoriteLayoutIntent = createAction(
  DashboardConfigAction.LAYOUT_FAVORITE,
  (name: string) => ({
    payload: {
      newLayoutName: name,
    } as DashboardReplaceLayoutActionPayload,
  })
);

export const dashboardConfigCreateTemplateIntent = createAction(
  DashboardConfigAction.TEMPLATE_ADD,
  (template: LayoutTemplate) => ({
    payload: {
      template,
    } as DashboardAddTemplateActionPayload,
  })
);

export const dashboardConfigDeleteTemplateIntent = createAction(
  DashboardConfigAction.TEMPLATE_REMOVE,
  (name: string) => ({
    payload: {
      name,
    } as DashboardDeleteTemplateActionPayload,
  })
);

export const dashboardConfigTemplateHistoryPushIntent = createAction(
  DashboardConfigAction.TEMPLATE_HISTORY_PUSH,
  (template: LayoutTemplate) => ({
    payload: {
      template,
    } as DashboardHistoryPushTemplateActionPayload,
  })
);

export const dashboardConfigTemplateHistoryClearIntent = createAction(
  DashboardConfigAction.TEMPLATE_HISTORY_CLEAR,
  () => ({
    payload: {} as DashboardHistoryClearTemplateActionPayload,
  })
);

export const dashboardConfigClearLayoutIntent = createAction(DashboardConfigAction.LAYOUT_CLEAR, () => ({
  payload: {} as DashboardLayoutClearActionPayload,
}));

export interface DashboardConfig {
  layouts: DashboardLayout[];
  customTemplates: LayoutTemplate[];
  templateHistory: LayoutTemplateRecord[];
  current: number;
  readonly _version: string;
}

export const TEMPLATE_HISTORY_LIMIT = 5;

export const defaultDashboardConfigs: DashboardConfig = {
  layouts: [
    {
      name: 'Default',
      cards: [],
      favorite: true,
    },
  ],
  customTemplates: [],
  templateHistory: [],
  current: 0,
  _version: _version,
};

const INITIAL_STATE: DashboardConfig = getPersistedState('DASHBOARD_CFG', _version, defaultDashboardConfigs);

const getTemplateHistoryIndexForMutation = (state: DashboardConfig, templateName: string) => {
  const idx = state.templateHistory.findIndex((t) => t.name === templateName && t.vendor === LayoutTemplateVendor.USER);
  return idx;
};

export const dashboardConfigReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(dashboardConfigClearLayoutIntent, (state) => {
      const currentLayout = state.layouts[state.current];
      currentLayout.cards = [];
    })
    .addCase(dashboardConfigAddCardIntent, (state, { payload }) => {
      state.layouts[state.current].cards.push(payload);
    })
    .addCase(dashboardConfigDeleteCardIntent, (state, { payload }) => {
      state.layouts[state.current].cards.splice(payload.idx || 0, 1);
    })
    .addCase(dashboardConfigResizeCardIntent, (state, { payload }) => {
      state.layouts[state.current].cards[payload.idx].span = payload.span;
    })
    .addCase(dashboardConfigReorderCardIntent, (state, { payload }) => {
      if (payload.swap) {
        swap(state.layouts[state.current].cards, payload.prevOrder, payload.nextOrder);
      } else {
        move(state.layouts[state.current].cards, payload.prevOrder, payload.nextOrder);
      }
    })
    .addCase(dashboardConfigFirstRunIntent, (state) => {
      state.layouts[state.current].cards = [
        {
          id: `${MBeanMetricsChartCardDescriptor.component.cardComponentName}-1`,
          name: MBeanMetricsChartCardDescriptor.component.cardComponentName,
          span: MBeanMetricsChartCardDescriptor.cardSizes.span.default,
          props: {
            themeColor: 'blue',
            chartKind: 'Process CPU Load',
            duration: 60,
            period: 10,
          },
        },
        {
          id: `${MBeanMetricsChartCardDescriptor.component.cardComponentName}-2`,
          name: MBeanMetricsChartCardDescriptor.component.cardComponentName,
          span: MBeanMetricsChartCardDescriptor.cardSizes.span.default,
          props: {
            themeColor: 'purple',
            chartKind: 'Heap Memory Usage',
            duration: 60,
            period: 10,
          },
        },
        {
          id: `${MBeanMetricsChartCardDescriptor.component.cardComponentName}-3`,
          name: MBeanMetricsChartCardDescriptor.component.cardComponentName,
          span: MBeanMetricsChartCardDescriptor.cardSizes.span.default,
          props: {
            themeColor: 'green',
            chartKind: 'Threads',
            duration: 60,
            period: 10,
          },
        },
      ];
    })
    .addCase(dashboardConfigCreateLayoutIntent, (state, { payload }) => {
      if (state.layouts.find((layout) => layout.name === payload.layout.name)) {
        throw new Error(`Layout with name ${payload.layout.name} already exists.`);
      }
      state.layouts.push(payload.layout);
    })
    .addCase(dashboardConfigDeleteLayoutIntent, (state, { payload }) => {
      const idx = state.layouts.findIndex((layout) => layout.name === payload.name);
      if (idx < 0) {
        throw new Error(`Layout with name ${payload.name} does not exist.`);
      }
      state.layouts.splice(idx || 0, 1);
    })
    .addCase(dashboardConfigRenameLayoutIntent, (state, { payload }) => {
      const idx = state.layouts.findIndex((layout) => layout.name === payload.oldName);
      if (idx < 0) {
        throw new Error(`Layout with name ${payload.oldName} does not exist.`);
      }
      state.layouts[idx].name = payload.newName;
    })
    .addCase(dashboardConfigReplaceLayoutIntent, (state, { payload }) => {
      const idx = state.layouts.findIndex((layout) => layout.name === payload.newLayoutName);
      if (idx < 0) {
        throw new Error(`Layout with name ${payload.newLayoutName} does not exist.`);
      }
      state.current = idx;
    })
    .addCase(dashboardConfigFavoriteLayoutIntent, (state, { payload }) => {
      const idx = state.layouts.findIndex((layout) => layout.name === payload.newLayoutName);
      if (idx < 0) {
        throw new Error(`Layout with name ${payload.newLayoutName} does not exist.`);
      }
      state.layouts[idx].favorite = !state.layouts[idx].favorite;
    })
    .addCase(dashboardConfigCreateTemplateIntent, (state, { payload }) => {
      const template = payload.template;
      const idx = state.customTemplates.findIndex((t) => t.name === template.name && t.vendor === template.vendor);
      if (idx >= 0) {
        throw new Error(`Template with name ${template.name} and vendor ${template.vendor} already exists.`);
      }
      state.customTemplates.push(template);
    })
    // template mutations (delete, rename, etc.) should never be called on non-custom templates (vendor !== LayoutTemplateVendor.USER)
    .addCase(dashboardConfigDeleteTemplateIntent, (state, { payload }) => {
      const idx = state.customTemplates.findIndex((t) => t.name === payload.name);
      if (idx < 0) {
        throw new Error(`Template with name ${payload.name} does not exist.`);
      }
      state.customTemplates.splice(idx, 1);
      const historyIdx = getTemplateHistoryIndexForMutation(state, payload.name);
      if (historyIdx >= 0) {
        state.templateHistory.splice(historyIdx, 1);
      }
    })
    // any template type except for the 'Blank' template can be pushed to history
    .addCase(dashboardConfigTemplateHistoryPushIntent, (state, { payload }) => {
      // We only push the template name and vendor to the history
      const template = payload.template;
      if (template.name === 'Blank' && template.vendor === undefined) {
        return;
      }
      const idx = state.templateHistory.findIndex((t) => t.name === template.name && t.vendor === template.vendor);
      if (idx >= 0) {
        state.templateHistory.splice(idx, 1);
      } else if (state.templateHistory.length >= TEMPLATE_HISTORY_LIMIT) {
        state.templateHistory.pop();
      }
      state.templateHistory.unshift({
        name: template.name,
        vendor: template.vendor,
      } as LayoutTemplateRecord);
    })
    .addCase(dashboardConfigTemplateHistoryClearIntent, (state) => {
      state.templateHistory = [];
    });
});

export default dashboardConfigReducer;
