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

import { useModalFromLocationState } from '@app/utils/hooks/useModalFromLocationState';
import { screen } from '@testing-library/react';
import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { render } from '../../utils';

const ROUTE = '/rules';
const OTHER_ROUTE = '/recordings';

const TestComponent: React.FC = () => {
  const [isOpen, , close] = useModalFromLocationState();
  const location = useLocation();
  return (
    <div>
      <div data-testid="isOpen">{isOpen.toString()}</div>
      <div data-testid="locationState">{JSON.stringify(location.state)}</div>
      <button onClick={close}>Close</button>
    </div>
  );
};

const renderHookComponent = (preloadedState = {}, initialEntries: object[] = [{ pathname: ROUTE }]) =>
  render({
    routerConfigs: {
      routes: [{ path: ROUTE, element: <TestComponent /> }],
      options: { initialEntries },
    },
    preloadedState,
  });

describe('useModalFromLocationState', () => {
  it('should stay closed when nothing is prefilled', () => {
    renderHookComponent();

    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
  });

  it('should open from router location state', () => {
    renderHookComponent({}, [{ pathname: ROUTE, state: { openCreateModal: true } }]);

    expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
  });

  it('should open from the Redux slot of the current route', () => {
    renderHookComponent({ modalPrefill: { [ROUTE]: { openCreateModal: true } } });

    expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
  });

  it('should ignore the Redux slot of another route', () => {
    renderHookComponent({ modalPrefill: { [OTHER_ROUTE]: { openCreateModal: true } } });

    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
  });

  it('should clear only its own route slot and the router state on close', async () => {
    const { user, store, router } = renderHookComponent(
      {
        modalPrefill: {
          [ROUTE]: { openCreateModal: true },
          [OTHER_ROUTE]: { openCreateModal: true },
        },
      },
      [{ pathname: ROUTE, state: { openCreateModal: true } }],
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    expect(store.getState().modalPrefill).toEqual({ [OTHER_ROUTE]: { openCreateModal: true } });
    expect(router.state.location.state).toBeNull();
  });
});
