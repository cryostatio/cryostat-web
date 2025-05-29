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
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { render, renderSnapshot } from '../utils';

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
  agent: false,
  connectUrl: 'service:jmx:rmi://someFooUrl',
  alias: 'fooTarget',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockFooTarget));

jest.spyOn(defaultServices.api, 'isArchiveEnabled').mockReturnValue(of(true));

describe('<Recordings />', () => {
  afterEach(cleanup);

  it('has the correct title in the TargetView', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <Recordings />,
          },
        ],
      },
    });

    expect(screen.getByText('Recordings')).toBeInTheDocument();
  });

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <Recordings />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
