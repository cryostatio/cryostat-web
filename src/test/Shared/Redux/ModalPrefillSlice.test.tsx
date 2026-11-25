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

import modalPrefillReducer, {
  modalPrefillClearIntent,
  modalPrefillSetIntent,
} from '@app/Shared/Redux/ModalPrefillSlice';

const ROUTE_A = '/analyze-thread-dumps';
const ROUTE_B = '/recordings';

describe('ModalPrefillSlice', () => {
  describe('initial state', () => {
    it('should hold no route slots', () => {
      expect(modalPrefillReducer(undefined, { type: '@@INIT' })).toEqual({});
    });
  });

  describe('modalPrefillSetIntent', () => {
    it('should store data under the given route', () => {
      const state = modalPrefillReducer({}, modalPrefillSetIntent(ROUTE_A, { jvmId: 'foo', threadDumpId: 'bar' }));

      expect(state).toEqual({ [ROUTE_A]: { jvmId: 'foo', threadDumpId: 'bar' } });
    });

    it('should replace the data of a route that already has a slot', () => {
      let state = modalPrefillReducer({}, modalPrefillSetIntent(ROUTE_A, { jvmId: 'foo', threadDumpId: 'bar' }));
      state = modalPrefillReducer(state, modalPrefillSetIntent(ROUTE_A, { jvmId: 'baz' }));

      expect(state).toEqual({ [ROUTE_A]: { jvmId: 'baz' } });
    });

    it('should keep slots for other routes independent', () => {
      let state = modalPrefillReducer({}, modalPrefillSetIntent(ROUTE_A, { jvmId: 'foo' }));
      state = modalPrefillReducer(state, modalPrefillSetIntent(ROUTE_B, { openCreateModal: true }));

      expect(state).toEqual({
        [ROUTE_A]: { jvmId: 'foo' },
        [ROUTE_B]: { openCreateModal: true },
      });
    });

    it('should distinguish an explicitly emptied slot from an absent one', () => {
      const state = modalPrefillReducer({}, modalPrefillSetIntent(ROUTE_A, {}));

      expect(state).toEqual({ [ROUTE_A]: {} });
      expect(Object.keys(state)).toContain(ROUTE_A);
    });
  });

  describe('modalPrefillClearIntent', () => {
    it('should remove only the slot of the given route', () => {
      let state = modalPrefillReducer({}, modalPrefillSetIntent(ROUTE_A, { jvmId: 'foo' }));
      state = modalPrefillReducer(state, modalPrefillSetIntent(ROUTE_B, { openCreateModal: true }));
      state = modalPrefillReducer(state, modalPrefillClearIntent(ROUTE_B));

      expect(state).toEqual({ [ROUTE_A]: { jvmId: 'foo' } });
      expect(Object.keys(state)).not.toContain(ROUTE_B);
    });

    it('should leave state unchanged for a route without a slot', () => {
      const initial = modalPrefillReducer({}, modalPrefillSetIntent(ROUTE_A, { jvmId: 'foo' }));
      const state = modalPrefillReducer(initial, modalPrefillClearIntent(ROUTE_B));

      expect(state).toEqual({ [ROUTE_A]: { jvmId: 'foo' } });
    });
  });
});
