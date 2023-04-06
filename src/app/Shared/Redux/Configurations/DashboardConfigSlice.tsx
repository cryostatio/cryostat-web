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

import { MBeanMetricsChartCardDescriptor } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartCard';
import { LayoutTemplate } from '@app/Dashboard/DashboardUtils';
import { move, swap } from '@app/utils/utils';
import { gridSpans } from '@patternfly/react-core';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';

export const _dashboardConfigVersion = '4';

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

export const dashboardConfigAddLayoutIntent = createAction(
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

export const dashboardConfigAddTemplateIntent = createAction(
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

export const dashboardConfigRenameTemplateIntent = createAction(
  DashboardConfigAction.TEMPLATE_RENAME,
  (oldName: string, newName: string) => ({
    payload: {
      oldName,
      newName,
    } as DashboardRenameTemplateActionPayload,
  })
);

export const dashboardConfigHistoryPushTemplateIntent = createAction(
  DashboardConfigAction.TEMPLATE_HISTORY_PUSH,
  (template: LayoutTemplate) => ({
    payload: {
      template,
    } as DashboardHistoryPushTemplateActionPayload,
  })
);

export interface CardConfig {
  id: string;
  name: string;
  span: gridSpans;
  props: object;
}

export type SerialCardConfig = Omit<CardConfig, 'id'>;

export interface DashboardLayout {
  name: string;
  cards: CardConfig[];
  favorite: boolean;
}

export type SerialDashboardLayout = Omit<DashboardLayout, 'cards'> & { cards: SerialCardConfig[] };

export interface DashboardConfigState {
  layouts: DashboardLayout[];
  templateHistory: LayoutTemplate[];
  customTemplates: LayoutTemplate[];
  current: number;
  readonly _version: string;
}

const INITIAL_STATE: DashboardConfigState = getPersistedState('DASHBOARD_CFG', _dashboardConfigVersion, {
  layouts: [
    {
      name: 'Default',
      cards: [],
      favorite: true,
    },
  ] as DashboardLayout[],
  customTemplates: [] as LayoutTemplate[],
  templateHistory: [] as LayoutTemplate[],
  current: 0,
});

export const dashboardConfigReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
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
          id: `${MBeanMetricsChartCardDescriptor.component.name}-1`,
          name: MBeanMetricsChartCardDescriptor.component.name,
          span: MBeanMetricsChartCardDescriptor.cardSizes.span.default,
          props: {
            themeColor: 'blue',
            chartKind: 'Process CPU Load',
            duration: 60,
            period: 10,
          },
        },
        {
          id: `${MBeanMetricsChartCardDescriptor.component.name}-2`,
          name: MBeanMetricsChartCardDescriptor.component.name,
          span: MBeanMetricsChartCardDescriptor.cardSizes.span.default,
          props: {
            themeColor: 'purple',
            chartKind: 'Heap Memory Usage',
            duration: 60,
            period: 10,
          },
        },
        {
          id: `${MBeanMetricsChartCardDescriptor.component.name}-3`,
          name: MBeanMetricsChartCardDescriptor.component.name,
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
    .addCase(dashboardConfigAddLayoutIntent, (state, { payload }) => {
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
    .addCase(dashboardConfigAddTemplateIntent, (state, { payload }) => {
      const template = payload.template;
      const idx = state.templateHistory.findIndex((t) => t.name === template.name && t.vendor === template.vendor);
      if (idx >= 0) {
        throw new Error(`Template with name ${template.name} and vendor ${template.vendor} already exists.`);
      }
      state.customTemplates.push(template);
    })
    .addCase(dashboardConfigDeleteTemplateIntent, (state, { payload }) => {
      const idx = state.customTemplates.findIndex((t) => t.name === payload.name);
      if (idx < 0) {
        throw new Error(`Template with name ${payload.name} does not exist.`);
      }
      state.customTemplates.splice(idx, 1);
    })
    .addCase(dashboardConfigRenameTemplateIntent, (state, { payload }) => {
      const idx = state.customTemplates.findIndex((t) => t.name === payload.oldName);
      if (idx < 0) {
        throw new Error(`Template with name ${payload.oldName} does not exist.`);
      }
      state.customTemplates[idx].name = payload.newName;
    })
    .addCase(dashboardConfigHistoryPushTemplateIntent, (state, { payload }) => {
      const template = payload.template;
      const idx = state.templateHistory.findIndex((t) => t.name === template.name && t.vendor === template.vendor);
      if (idx >= 0) {
        state.templateHistory.splice(idx, 1);
      } else if (state.templateHistory.length >= 4) {
        state.templateHistory.pop();
      }
      state.templateHistory.unshift(template);
    });
});

export default dashboardConfigReducer;
