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

export enum ModalPrefillAction {
  SET = 'modal-prefill/set',
  CLEAR = 'modal-prefill/clear',
}

export const enumValues = new Set(Object.values(ModalPrefillAction));

export type ModalPrefillState = Record<string, Record<string, unknown>>;

export const modalPrefillSetIntent = createAction(
  ModalPrefillAction.SET,
  (route: string, data: Record<string, unknown>) => ({
    payload: { route, data },
  }),
);

export const modalPrefillClearIntent = createAction(ModalPrefillAction.CLEAR, (route: string) => ({
  payload: { route },
}));

const INITIAL_STATE: ModalPrefillState = {};

export const modalPrefillReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(modalPrefillSetIntent, (state, { payload }) => {
      state[payload.route] = payload.data;
    })
    .addCase(modalPrefillClearIntent, (state, { payload }) => {
      delete state[payload.route];
    });
});

export default modalPrefillReducer;
