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

import { createAction } from '@reduxjs/toolkit';

// Common action string format: "resource(s)/action"
export enum AutomatedAnalysisFilterAction {
  GLOBAL_FILTER_ADD = 'automated-analysis-global-filter/add',
  FILTER_ADD = 'automated-analysis-filter/add',
  FILTER_DELETE = 'automated-analysis-filter/delete',
  FILTER_DELETE_ALL = 'automated-analysis-filter/delete_all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'automated-analysis-filters/delete', // Delete all filters of the same category
  CATEGORY_UPDATE = 'automated-analysis-category/update',
  TARGET_ADD = 'automated-analysis-target/add',
  TARGET_DELETE = 'automated-analysis-target/delete',
}

export interface AutomatedAnalysisFilterActionPayload {
  target: string;
  category?: string;
  filter?: any;
}

export const automatedAnalysisAddGlobalFilterIntent = createAction(
  AutomatedAnalysisFilterAction.GLOBAL_FILTER_ADD,
  (category: string, filter: any) => ({
    payload: {
      category: category,
      filter: filter,
    },
  })
);

export const automatedAnalysisAddFilterIntent = createAction(
  AutomatedAnalysisFilterAction.FILTER_ADD,
  (target: string, category: string, filter: any) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as AutomatedAnalysisFilterActionPayload,
  })
);

export const automatedAnalysisDeleteFilterIntent = createAction(
  AutomatedAnalysisFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: any) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as AutomatedAnalysisFilterActionPayload,
  })
);

export const automatedAnalysisDeleteCategoryFiltersIntent = createAction(
  AutomatedAnalysisFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as AutomatedAnalysisFilterActionPayload,
  })
);

export const automatedAnalysisDeleteAllFiltersIntent = createAction(
  AutomatedAnalysisFilterAction.FILTER_DELETE_ALL,
  (target: string) => ({
    payload: {
      target: target,
    } as AutomatedAnalysisFilterActionPayload,
  })
);

export const automatedAnalysisUpdateCategoryIntent = createAction(
  AutomatedAnalysisFilterAction.CATEGORY_UPDATE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as AutomatedAnalysisFilterActionPayload,
  })
);

export const automatedAnalysisAddTargetIntent = createAction(
  AutomatedAnalysisFilterAction.TARGET_ADD,
  (target: string) => ({
    payload: {
      target: target,
    } as AutomatedAnalysisFilterActionPayload,
  })
);

export const automatedAnalysisDeleteTargetIntent = createAction(
  AutomatedAnalysisFilterAction.TARGET_DELETE,
  (target: string) => ({
    payload: {
      target: target,
    } as AutomatedAnalysisFilterActionPayload,
  })
);
