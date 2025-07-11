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
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { render, renderSnapshot } from '../utils';
import { Target } from '@app/Shared/Services/api.types';

jest.mock('@app/TargetView/TargetContextSelector', () => {
  return {
    TargetContextSelector: jest.fn(() => {
      return <div>Target Context Selector</div>;
    }),
  };
});

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => {
  return {
    ArchivedRecordingsTable: jest.fn((props) => {
      return props.isUploadsTable ? <div>Uploads Table</div> : <div>Target Archives Table</div>;
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
  .mockReturnValueOnce(of(false)) // Test archives disabled case
  .mockReturnValue(of(true));

const mockTarget: Target = {
  agent: false,
  connectUrl: 'http://localhost',
  alias: 'fakeTarget',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};
jest
  .spyOn(defaultServices.target, 'target')
  .mockReturnValueOnce(of(mockTarget)) // Test archives disabled case
  .mockReturnValueOnce(of(undefined)) // Test no target selection case
  .mockReturnValue(of(mockTarget));

describe('<Archives />', () => {
  afterEach(cleanup);

  it('handles the case where archiving is disabled', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <Archives /> }] } });

    expect(screen.queryByText('All Targets')).not.toBeInTheDocument();
    expect(screen.queryByText('Uploads')).not.toBeInTheDocument();
    expect(screen.getByText('Archives Unavailable')).toBeInTheDocument();
  });

  it('handles no target selection', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <Archives /> }] } });

    expect(screen.getByText('To view this content, select a JVM target.')).toBeInTheDocument();
  });

  it('has the correct page title', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <Archives /> }] } });

    expect(screen.getByText('Archives')).toBeInTheDocument();
  });

  it('handles the case where archiving is enabled', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <Archives /> }] } });

    expect(screen.getByText('All Targets')).toBeInTheDocument();
    expect(screen.getByText('Uploads')).toBeInTheDocument();
  });

  it.skip('handles changing tabs', async () => {
    const { user } = render({ routerConfigs: { routes: [{ path: '/archives', element: <Archives /> }] } });

    // Assert that the All Targets tab is currently selected (default behaviour)
    let tabsList = screen.getAllByRole('tab');

    let firstTab = tabsList[0];
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(within(firstTab).getByText('Target')).toBeTruthy();

    let secondTab = tabsList[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'false');
    expect(within(secondTab).getByText('All Targets')).toBeTruthy();

    let thirdTab = tabsList[2];
    expect(thirdTab).toHaveAttribute('aria-selected', 'false');
    expect(within(thirdTab).getByText('All Archives')).toBeTruthy();

    let fourthTab = tabsList[3];
    expect(fourthTab).toHaveAttribute('aria-selected', 'false');
    expect(within(fourthTab).getByText('Uploads')).toBeTruthy();

    // Click the Uploads tab
    await user.click(screen.getByText('Uploads'));

    // Assert that the Uploads tab is now selected
    tabsList = screen.getAllByRole('tab');

    firstTab = tabsList[0];
    expect(firstTab).toHaveAttribute('aria-selected', 'false');
    expect(within(firstTab).getByText('Target')).toBeTruthy();

    secondTab = tabsList[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'false');
    expect(within(secondTab).getByText('All Targets')).toBeTruthy();

    thirdTab = tabsList[2];
    expect(thirdTab).toHaveAttribute('aria-selected', 'false');
    expect(within(thirdTab).getByText('All Archives')).toBeTruthy();

    fourthTab = tabsList[3];
    expect(fourthTab).toHaveAttribute('aria-selected', 'true');
    expect(within(fourthTab).getByText('Uploads')).toBeTruthy();
  });

  it('renders correctly', async () => {
    const tree = await renderSnapshot({ routerConfigs: { routes: [{ path: '/archives', element: <Archives /> }] } });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
