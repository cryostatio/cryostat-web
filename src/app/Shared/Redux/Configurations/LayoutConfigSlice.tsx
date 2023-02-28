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
import { createAction, createReducer, nanoid } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';
import { DashboardConfigState, _dashboardConfigVersion } from './DashboardConfigSlice';

export const _layoutConfigVersion = '3';

// Common action string format: "resource(s)/action"
export enum LayoutConfigAction {
  LAYOUT_ADD = 'layout-config/add',
  LAYOUT_REMOVE = 'layout-config/remove',
  LAYOUT_UPDATE = 'layout-config/update',
  LAYOUT_FIRST_RUN = 'layout-config/first-run',
}

export const enumValues = new Set(Object.values(LayoutConfigAction));

export interface LayoutAddConfigActionPayload {
  layout: DashboardConfigState;
}

export interface LayoutDeleteConfigActionPayload {
  name: string;
}

export interface LayoutUpdateConfigActionPayload {
  layout: DashboardConfigState;
}

export interface LayoutFirstRunActionPayload {}

export const layoutConfigAddLayoutIntent = createAction(
  LayoutConfigAction.LAYOUT_ADD,
  (layout: DashboardConfigState) => ({
    payload: {
      layout,
    } as LayoutAddConfigActionPayload,
  })
);

export const layoutConfigDeleteLayoutIntent = createAction(LayoutConfigAction.LAYOUT_REMOVE, (name: string) => ({
  payload: {
    name,
  } as LayoutDeleteConfigActionPayload,
}));

export const layoutConfigUpdateLayoutIntent = createAction(
  LayoutConfigAction.LAYOUT_UPDATE,
  (layout: DashboardConfigState) => ({
    payload: {
      layout,
    } as LayoutUpdateConfigActionPayload,
  })
);

export const layoutConfigFirstRunIntent = createAction(LayoutConfigAction.LAYOUT_FIRST_RUN, () => ({
  payload: {} as LayoutFirstRunActionPayload,
}));

export interface LayoutConfigState {
  list: DashboardConfigState[];
  readonly _version: string;
}

const INITIAL_STATE: LayoutConfigState = getPersistedState('DASHBOARD_LAYOUTS', _layoutConfigVersion, {
  list: [
    {
      name: 'Default',
      list: [],
      _version: _dashboardConfigVersion,
    },
  ] as DashboardConfigState[],
});

export const layoutConfigReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(layoutConfigAddLayoutIntent, (state, { payload }) => {
      state.list.push(payload.layout);
    })
    .addCase(layoutConfigDeleteLayoutIntent, (state, { payload }) => {
      const idx = state.list.findIndex((layout) => layout.name === payload.name);
      state.list.splice(idx || 0, 1);
    })
    .addCase(layoutConfigUpdateLayoutIntent, (state, { payload }) => {
      const idx = state.list.findIndex((layout) => layout.name === payload.layout.name);
      if (idx !== -1) {
        state.list[idx] = payload.layout;
      }
    })
    .addCase(layoutConfigFirstRunIntent, (state) => {
      state.list = [
        {
          name: 'Default',
          list: [
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
          ],
          _version: _dashboardConfigVersion,
        },
      ] as DashboardConfigState[];
    });
});

export default layoutConfigReducer;
