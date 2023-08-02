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
import { Archives } from '@app/Archives/Archives';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { Router } from 'react-router-dom';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import { renderWithServiceContextAndRouter } from '../Common';

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => {
  return {
    ArchivedRecordingsTable: jest.fn(() => {
      return <div>Uploads Table</div>;
    }),
  };
});

jest.mock('@app/Archives/AllArchivedRecordingsTable', () => {
  return {
    AllArchivedRecordingsTable: jest.fn(() => {
      return <div>All Archives Table</div>;
    }),
  };
});

jest.mock('@app/Archives/AllTargetsArchivedRecordingsTable', () => {
  return {
    AllTargetsArchivedRecordingsTable: jest.fn(() => {
      return <div>All Targets Table</div>;
    }),
  };
});

jest
  .spyOn(defaultServices.api, 'isArchiveEnabled')
  .mockReturnValueOnce(of(true))
  .mockReturnValueOnce(of(true))
  .mockReturnValueOnce(of(false)) // Test archives disabled case
  .mockReturnValue(of(true));

const history = createMemoryHistory({ initialEntries: ['/archives'] });

describe('<Archives />', () => {
  afterEach(cleanup);

  it('has the correct page title', async () => {
    renderWithServiceContextAndRouter(<Archives />, { history: history });

    expect(screen.getByText('Archives')).toBeInTheDocument();
  });

  it('handles the case where archiving is enabled', async () => {
    renderWithServiceContextAndRouter(<Archives />, { history: history });

    expect(screen.getByText('All Targets')).toBeInTheDocument();
    expect(screen.getByText('Uploads')).toBeInTheDocument();
  });

  it('handles the case where archiving is disabled', async () => {
    renderWithServiceContextAndRouter(<Archives />, { history: history });

    expect(screen.queryByText('All Targets')).not.toBeInTheDocument();
    expect(screen.queryByText('Uploads')).not.toBeInTheDocument();
    expect(screen.getByText('Archives Unavailable')).toBeInTheDocument();
  });

  it('handles changing tabs', async () => {
    const { user } = renderWithServiceContextAndRouter(<Archives />, { history: history });

    // Assert that the All Targets tab is currently selected (default behaviour)
    let tabsList = screen.getAllByRole('tab');

    let firstTab = tabsList[0];
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(within(firstTab).getByText('All Targets')).toBeTruthy();

    let secondTab = tabsList[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'false');
    expect(within(secondTab).getByText('All Archives')).toBeTruthy();

    let thirdTab = tabsList[2];
    expect(thirdTab).toHaveAttribute('aria-selected', 'false');
    expect(within(thirdTab).getByText('Uploads')).toBeTruthy();

    // Click the Uploads tab
    await user.click(screen.getByText('Uploads'));

    // Assert that the Uploads tab is now selected
    tabsList = screen.getAllByRole('tab');

    firstTab = tabsList[0];
    expect(firstTab).toHaveAttribute('aria-selected', 'false');
    expect(within(firstTab).getByText('All Targets')).toBeTruthy();

    secondTab = tabsList[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'false');
    expect(within(secondTab).getByText('All Archives')).toBeTruthy();

    thirdTab = tabsList[2];
    expect(thirdTab).toHaveAttribute('aria-selected', 'true');
    expect(within(thirdTab).getByText('Uploads')).toBeTruthy();
  });

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <Router history={history}>
              <Archives />
            </Router>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
