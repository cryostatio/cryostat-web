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
import { QuickStartsCardDescriptor } from '@app/Dashboard/Quickstart/QuickStartsCard';
import { moveDashboardCard, swapDashboardCard } from '@app/utils/utils';
import { gridSpans } from '@patternfly/react-core';
import { createAction, createReducer, nanoid } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';

export const _dashboardConfigVersion = '3';

// Common action string format: "resource(s)/action"
export enum DashboardConfigAction {
  CARD_ADD = 'dashboard-card-config/add',
  CARD_REMOVE = 'dashboard-card-config/remove',
  CARD_REORDER = 'dashboard-card-config/reorder',
  CARD_RESIZE = 'dashboard-card-config/resize',
  FIRST_RUN = 'dashboard-card-config/first-run',
  LAYOUT_REPLACE = 'dashboard-layout-config/replace',
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
export interface DashboardReplaceConfigActionPayload {
  newLayoutName: string;
  newConfig: CardConfig[];
}

export const dashboardCardConfigAddCardIntent = createAction(
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

export const dashboardCardConfigDeleteCardIntent = createAction(DashboardConfigAction.CARD_REMOVE, (idx: number) => ({
  payload: {
    idx,
  } as DashboardDeleteConfigActionPayload,
}));

export const dashboardCardConfigResizeCardIntent = createAction(
  DashboardConfigAction.CARD_RESIZE,
  (idx: number, span: gridSpans) => ({
    payload: {
      idx,
      span,
    } as DashboardResizeConfigActionPayload,
  })
);

export const dashboardCardConfigReorderCardIntent = createAction(
  DashboardConfigAction.CARD_REORDER,
  (prevOrder: number, nextOrder: number, swap = false) => ({
    payload: {
      prevOrder,
      nextOrder,
      swap,
    } as DashboardOrderConfigActionPayload,
  })
);

export const dashboardCardConfigFirstRunIntent = createAction(DashboardConfigAction.FIRST_RUN, () => ({
  payload: {} as DashboardFirstRunActionPayload,
}));

export const dashboardLayoutConfigReplaceCardIntent = createAction(
  DashboardConfigAction.LAYOUT_REPLACE,
  (name: string, config: CardConfig[]) => ({
    payload: {
      newLayoutName: name,
      newConfig: config,
    } as DashboardReplaceConfigActionPayload,
  })
);

export interface CardConfig {
  id: string;
  name: string;
  span: gridSpans;
  props: object;
}

export type SerialCardConfig = Omit<CardConfig, 'id'>;

export interface DashboardConfigState {
  name: string;
  list: CardConfig[];
  readonly _version: string;
}

export type SerialDashboardConfig = Omit<DashboardConfigState, '_version'>;

const INITIAL_STATE: DashboardConfigState = getPersistedState('DASHBOARD_CFG', _dashboardConfigVersion, {
  list: [] as CardConfig[],
  name: 'Default',
});

export const dashboardConfigReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(dashboardCardConfigAddCardIntent, (state, { payload }) => {
      state.list.push(payload);
    })
    .addCase(dashboardCardConfigDeleteCardIntent, (state, { payload }) => {
      state.list.splice(payload.idx || 0, 1);
    })
    .addCase(dashboardCardConfigResizeCardIntent, (state, { payload }) => {
      state.list[payload.idx].span = payload.span;
    })
    .addCase(dashboardCardConfigReorderCardIntent, (state, { payload }) => {
      if (payload.swap) {
        swapDashboardCard(state.list, payload.prevOrder, payload.nextOrder);
      } else {
        moveDashboardCard(state.list, payload.prevOrder, payload.nextOrder);
      }
    })
    .addCase(dashboardCardConfigFirstRunIntent, (state) => {
      state.list = [
        {
          id: `${QuickStartsCardDescriptor.component.name}-${nanoid()}`,
          name: QuickStartsCardDescriptor.component.name,
          span: QuickStartsCardDescriptor.cardSizes.span.default,
          props: {},
        },
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
    .addCase(dashboardLayoutConfigReplaceCardIntent, (state, { payload }) => {
      state.name = payload.newLayoutName;
      state.list = payload.newConfig;
    });
});

export default dashboardConfigReducer;
