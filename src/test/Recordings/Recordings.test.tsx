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
import { Recordings } from '@app/Recordings/Recordings';
import { Target } from '@app/Shared/Services/api.types';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { Router } from 'react-router-dom';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import { renderWithServiceContextAndRouter } from '../Common';

jest.mock('@app/Recordings/ActiveRecordingsTable', () => {
  return {
    ActiveRecordingsTable: jest.fn((_) => {
      return <div>Active Recordings Table</div>;
    }),
  };
});

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => {
  return {
    ArchivedRecordingsTable: jest.fn((_) => {
      return <div>Archived Recordings Table</div>;
    }),
  };
});

jest.mock('@app/TargetView/TargetView', () => {
  return {
    TargetView: jest.fn((props) => {
      return (
        <div>
          {props.pageTitle}
          {props.children}
        </div>
      );
    }),
  };
});

const mockFooTarget: Target = {
  connectUrl: 'service:jmx:rmi://someFooUrl',
  alias: 'fooTarget',
  annotations: {
    cryostat: {},
    platform: {},
  },
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockFooTarget));

jest
  .spyOn(defaultServices.api, 'isArchiveEnabled')
  .mockReturnValueOnce(of(true)) // has the correct title in the TargetView
  .mockReturnValueOnce(of(true)) // handles the case where archiving is enabled
  .mockReturnValueOnce(of(false)) // handles the case where archiving is disabled
  .mockReturnValue(of(true)); // others

const history = createMemoryHistory({ initialEntries: ['/recordings'] });

describe('<Recordings />', () => {
  afterEach(cleanup);

  it('has the correct title in the TargetView', async () => {
    renderWithServiceContextAndRouter(<Recordings />, { history });

    expect(screen.getByText('Recordings')).toBeInTheDocument();
  });

  it('handles the case where archiving is enabled', async () => {
    renderWithServiceContextAndRouter(<Recordings />, { history });

    expect(screen.getByText('Active Recordings')).toBeInTheDocument();
    expect(screen.getByText('Archived Recordings')).toBeInTheDocument();
  });

  it('handles the case where archiving is disabled', async () => {
    renderWithServiceContextAndRouter(<Recordings />, { history });

    expect(screen.getByText('Active Recordings')).toBeInTheDocument();
    expect(screen.queryByText('Archived Recordings')).not.toBeInTheDocument();
  });

  it('handles updating the activeTab state', async () => {
    const { user } = renderWithServiceContextAndRouter(<Recordings />, { history });

    // Assert that the active recordings tab is currently selected (default behaviour)
    let tabsList = screen.getAllByRole('tab');

    let firstTab = tabsList[0];
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(within(firstTab).getByText('Active Recordings')).toBeTruthy();

    let secondTab = tabsList[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'false');
    expect(within(secondTab).getByText('Archived Recordings')).toBeTruthy();

    // Click the archived recordings tab
    await user.click(screen.getByText('Archived Recordings'));

    // Assert that the archived recordings tab is now selected
    tabsList = screen.getAllByRole('tab');

    firstTab = tabsList[0];
    expect(firstTab).toHaveAttribute('aria-selected', 'false');
    expect(within(firstTab).getByText('Active Recordings')).toBeTruthy();

    secondTab = tabsList[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    expect(within(secondTab).getByText('Archived Recordings')).toBeTruthy();
  });

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <Router history={history}>
            <NotificationsContext.Provider value={NotificationsInstance}>
              <Recordings />
            </NotificationsContext.Provider>
          </Router>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
